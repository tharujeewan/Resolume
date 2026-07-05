import { PrismaClient, RoleName } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding database...');

  // 1. Seed Roles
  const roles = [
    { name: RoleName.SUPER_ADMIN },
    { name: RoleName.ORGANIZER },
    { name: RoleName.GUEST },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log('Roles seeded.');

  // Find Role IDs
  const adminRole = await prisma.role.findUnique({ where: { name: RoleName.SUPER_ADMIN } });
  const organizerRole = await prisma.role.findUnique({ where: { name: RoleName.ORGANIZER } });

  if (!adminRole || !organizerRole) {
    throw new Error('Roles could not be retrieved.');
  }

  // 2. Seed Default Super Admin
  const adminPasswordHash = await bcrypt.hash('AdminSecurePassword2026!', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@eventwall.com' },
    update: {},
    create: {
      email: 'admin@eventwall.com',
      passwordHash: adminPasswordHash,
      firstName: 'Super',
      lastName: 'Admin',
      roleId: adminRole.id,
      isVerified: true,
    },
  });
  console.log(`Super admin seeded: ${superAdmin.email}`);

  // 3. Seed Default Organizer (for easy development login)
  const organizerPasswordHash = await bcrypt.hash('OrganizerSecurePassword2026!', 10);
  const organizer = await prisma.user.upsert({
    where: { email: 'organizer@eventwall.com' },
    update: {},
    create: {
      email: 'organizer@eventwall.com',
      passwordHash: organizerPasswordHash,
      firstName: 'John',
      lastName: 'Doe',
      roleId: organizerRole.id,
      isVerified: true,
    },
  });
  console.log(`Default organizer seeded: ${organizer.email}`);

  // 4. Seed Global Settings
  const settings = [
    { key: 'site_name', value: 'EventWall' },
    { key: 'allow_public_registration', value: 'true' },
    { key: 'max_file_size_mb', value: '10' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log('Settings seeded.');

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
