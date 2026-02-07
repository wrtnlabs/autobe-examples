import { IEcommerceSystemStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceSystemStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSystemStatus";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSellerDashboard(props: {
  seller: SellerPayload;
}): Promise<IPageIEcommerceSystemStatus.ISummary> {
  const page = 1;
  const limit = 50;
  const skip = (page - 1) * limit;
  const statuses = await MyGlobal.prisma.ecommerce_system_statuses.findMany({
    where: {
      status: { in: ["warning", "unhealthy"] },
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { health_score: "desc" },
    select: { component_name: true, status: true, health_score: true },
  });
  const total = await MyGlobal.prisma.ecommerce_system_statuses.count({
    where: {
      status: { in: ["warning", "unhealthy"] },
      deleted_at: null,
    },
  });
  const formattedData = statuses.map((status) => ({
    component_name: status.component_name,
    status: status.status,
    health_score: status.health_score,
  }));
  return {
    data: formattedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
