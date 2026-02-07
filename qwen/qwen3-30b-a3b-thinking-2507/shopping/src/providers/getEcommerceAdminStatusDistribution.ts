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

export async function getEcommerceAdminStatusDistribution(props: {
  admin: AdminPayload;
}): Promise<IEcommerceSystemStatus> {
  const statusCounts = await MyGlobal.prisma.ecommerce_system_statuses.groupBy({
    by: ["status"],
    _count: {
      status: true,
    },
  });
  const healthyCount =
    statusCounts.find((c) => c.status === "healthy")?._count.status ?? 0;
  const warningCount =
    statusCounts.find((c) => c.status === "warning")?._count.status ?? 0;
  const unhealthyCount =
    statusCounts.find((c) => c.status === "unhealthy")?._count.status ?? 0;
  return {
    healthy: healthyCount,
    warning: warningCount,
    unhealthy: unhealthyCount,
  } as IEcommerceSystemStatus;
}
