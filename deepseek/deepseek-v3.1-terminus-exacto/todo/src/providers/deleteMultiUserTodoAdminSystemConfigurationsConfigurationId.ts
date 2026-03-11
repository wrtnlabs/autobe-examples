import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteMultiUserTodoAdminSystemConfigurationsConfigurationId(props: {
  admin: AdminPayload;
  configurationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify configuration exists and is not soft deleted
  const configuration =
    await MyGlobal.prisma.multi_user_todo_system_configurations.findUniqueOrThrow(
      {
        where: { id: props.configurationId },
        select: { id: true, config_key: true, deleted_at: true },
      },
    );
  if (configuration.deleted_at !== null) {
    throw new HttpException("Configuration already deleted", 409);
  }
  // Start transaction for atomic soft delete and audit logging
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Soft delete the configuration
    await tx.multi_user_todo_system_configurations.update({
      where: { id: props.configurationId },
      data: {
        deleted_at: now,
        is_active: false,
        updated_at: now,
      },
    });
    // Create maintenance log entry for audit trail
    await tx.multi_user_todo_system_maintenance_logs.create({
      data: {
        id: v4(),
        multi_user_todo_admin_id: props.admin.id,
        operation_type: "configuration_deletion",
        description: `Soft deleted system configuration '${configuration.config_key}' (ID: ${props.configurationId})`,
        status: "completed",
        started_at: now,
        completed_at: now,
        created_at: now,
        updated_at: now,
      },
    });
  });
}
