import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceSuperAdministratorMetadataRegistriesRegistryId(props: {
  superAdministrator: SuperadministratorPayload;
  registryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify registry exists
  const registry =
    await MyGlobal.prisma.ecommerce_metadata_registries.findUniqueOrThrow({
      where: { id: props.registryId },
    });
  // Validate registry is active before deletion
  if (!registry.is_active) {
    throw new HttpException("Cannot delete inactive metadata registry", 400);
  }
  // Check for systemSetting dependency
  const systemSettingExists =
    await MyGlobal.prisma.ecommerce_system_settings.findFirst({
      where: { id: registry.system_setting_id ?? undefined },
    });
  // Check for auditLog dependency
  const auditLogExists = await MyGlobal.prisma.ecommerce_audit_logs.findFirst({
    where: { id: registry.audit_log_id ?? undefined },
  });
  // Check for dbMigration dependency
  const dbMigrationExists =
    await MyGlobal.prisma.ecommerce_db_migrations.findFirst({
      where: { id: registry.db_migration_id ?? undefined },
    });
  if (systemSettingExists || auditLogExists || dbMigrationExists) {
    throw new HttpException(
      "Cannot delete registry with active dependencies",
      409,
    );
  }
  // Perform deletion - cascade handles field definitions and relationships
  await MyGlobal.prisma.ecommerce_metadata_registries.delete({
    where: { id: props.registryId },
  });
  // Note: Audit logging would be handled through trigger or separate audit system
  // Database-level cascade ensures related field definitions/relationships are removed
}
