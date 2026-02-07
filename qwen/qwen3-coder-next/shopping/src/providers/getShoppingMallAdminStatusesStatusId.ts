import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystematicStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicStatus";
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

export async function getShoppingMallAdminStatusesStatusId(props: {
  admin: AdminPayload;
  statusId: string;
}): Promise<IShoppingMallSystematicStatus> {
  const status =
    await MyGlobal.prisma.shopping_mall_systematic_statuses.findUnique({
      where: { id: props.statusId },
    });
  if (!status) {
    throw new HttpException("System status not found", 404);
  }
  return {
    id: status.id,
    status_key: status.status_key,
    current_status: status.current_status,
    last_updated: status.last_updated,
    uptime_percentage: status.uptime_percentage,
    avg_response_time_ms: status.avg_response_time_ms,
    error_rate_percentage: status.error_rate_percentage,
    cpu_utilization_percentage: status.cpu_utilization_percentage,
    memory_utilization_percentage: status.memory_utilization_percentage,
    disk_usage_percentage: status.disk_usage_percentage,
    active_connections: status.active_connections,
    queue_depth: status.queue_depth,
    last_error_message: status.last_error_message,
    error_timestamp: status.error_timestamp,
    version: status.version,
    last_check: status.last_check,
  };
}
