import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminSystemConfigsSystemConfigId(props: {
  admin: AdminPayload;
  systemConfigId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find config first to check existence
  const config =
    await MyGlobal.prisma.community_platform_system_configs.findUnique({
      where: { id: props.systemConfigId },
    });
  if (!config) {
    throw new HttpException("System configuration not found", 404);
  }

  // Hard delete config
  await MyGlobal.prisma.community_platform_system_configs.delete({
    where: { id: props.systemConfigId },
  });

  // Audit log entry
  const auditId = v4();
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: auditId,
      actor_type: "admin",
      actor_id: props.admin.id,
      action_type: "delete",
      target_table: "community_platform_system_configs",
      target_id: props.systemConfigId,
      details: JSON.stringify({
        key: config.key,
        value: config.value,
        description: config.description ?? null,
      }),
      created_at: now,
    },
  });
}
