import { IEcommerceSystemStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemStatus";
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

export async function getEcommerceAdminSystemStatusesId(props: {
  admin: AdminPayload;
  id: string;
}): Promise<IEcommerceSystemStatus> {
  const systemStatus =
    await MyGlobal.prisma.ecommerce_system_statuses.findUnique({
      where: { id: props.id, deleted_at: null },
    });
  if (!systemStatus) {
    throw new HttpException("System status not found", 404);
  }
  return {
    id: systemStatus.id,
    component_name: systemStatus.component_name,
    status: systemStatus.status as "healthy" | "warning" | "unhealthy",
    health_score: systemStatus.health_score,
    last_check_timestamp: toISOStringSafe(systemStatus.last_check_timestamp),
    created_at: toISOStringSafe(systemStatus.created_at),
    updated_at: toISOStringSafe(systemStatus.updated_at),
  };
}
