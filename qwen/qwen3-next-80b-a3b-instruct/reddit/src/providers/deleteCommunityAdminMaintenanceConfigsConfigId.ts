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

export async function deleteCommunityAdminMaintenanceConfigsConfigId(props: {
  admin: AdminPayload;
  configId: string;
}): Promise<void> {
  // Verify admin exists and is active in the system
  const admin = await MyGlobal.prisma.community_admins.findFirst({
    where: {
      id: props.admin.id,
      deleted_at: null,
    },
  });
  if (!admin) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify maintenance config exists
  const config = await MyGlobal.prisma.community_maintenance_configs.findUnique(
    {
      where: { id: props.configId },
    },
  );
  if (!config) {
    throw new HttpException("Maintenance configuration not found", 404);
  }
  // Permanently delete the configuration (no soft delete)
  await MyGlobal.prisma.community_maintenance_configs.delete({
    where: { id: props.configId },
  });
}
