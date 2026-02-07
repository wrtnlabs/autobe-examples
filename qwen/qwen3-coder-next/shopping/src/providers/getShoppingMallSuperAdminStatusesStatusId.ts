import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystematicStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicStatus";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSuperAdminStatusesStatusId(props: {
  superAdmin: SuperadminPayload;
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
    last_updated: toISOStringSafe(status.last_updated),
    uptime_percentage: status.uptime_percentage ?? null,
    avg_response_time_ms: status.avg_response_time_ms ?? null,
    error_rate_percentage: status.error_rate_percentage ?? null,
    cpu_utilization_percentage: status.cpu_utilization_percentage ?? null,
    memory_utilization_percentage: status.memory_utilization_percentage ?? null,
    disk_usage_percentage: status.disk_usage_percentage ?? null,
    active_connections: status.active_connections ?? null,
    queue_depth: status.queue_depth ?? null,
    last_error_message: status.last_error_message ?? null,
    error_timestamp: status.error_timestamp
      ? toISOStringSafe(status.error_timestamp)
      : null,
    version: status.version ?? null,
    last_check: toISOStringSafe(status.last_check),
  };
}
