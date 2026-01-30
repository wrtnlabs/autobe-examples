import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumMaintenanceMode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumMaintenanceMode";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getEconomicForumAdminSystemMaintenanceStatus(props: {
  admin: AdminPayload;
}): Promise<IEconomicForumMaintenanceMode> {
  // Query the maintenance mode record from database
  const maintenanceMode =
    await MyGlobal.prisma.economic_forum_maintenance_modes.findFirst({
      where: {
        // Removed deleted_at because it doesn't exist in schema
      },
    });
  // If no record exists, maintenance is inactive
  if (!maintenanceMode) {
    return { value: false };
  }
  // Get current time as string & Format<'date-time'>
  const currentTime = toISOStringSafe(new Date());
  // Calculate maintenance status: is_active AND current time between scheduled_start and scheduled_end
  const isActive =
    maintenanceMode.is_active &&
    maintenanceMode.scheduled_start !== null &&
    maintenanceMode.scheduled_end !== null &&
    currentTime >= toISOStringSafe(maintenanceMode.scheduled_start) &&
    currentTime <= toISOStringSafe(maintenanceMode.scheduled_end);
  return { value: isActive };
}
