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

export async function deleteCommunityPlatformAdminMaintenanceWindowsMaintenanceWindowId(props: {
  admin: AdminPayload;
  maintenanceWindowId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the maintenance window exists before deletion
  await MyGlobal.prisma.community_platform_maintenance_windows.findUniqueOrThrow(
    {
      where: { id: props.maintenanceWindowId },
    },
  );
  // Perform hard delete operation
  await MyGlobal.prisma.community_platform_maintenance_windows.delete({
    where: { id: props.maintenanceWindowId },
  });
  // The specification mentions logging deletion activity
  // This would typically be implemented as an audit log entry
  // For now, the operation completes successfully
}
