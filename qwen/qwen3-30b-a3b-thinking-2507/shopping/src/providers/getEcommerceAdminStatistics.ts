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

export async function getEcommerceAdminStatistics(props: {
  admin: AdminPayload;
}): Promise<IEcommerceSystemStatus> {
  const totalCustomers = await MyGlobal.prisma.ecommerce_customers.count({
    where: { deleted_at: null },
  });
  const totalOrders = await MyGlobal.prisma.ecommerce_orders.count({
    where: { deleted_at: null },
  });
  const revenueResult = await MyGlobal.prisma.ecommerce_order_items.aggregate({
    where: {
      deleted_at: null,
      order: {
        deleted_at: null,
      },
    },
    _sum: { price_at_purchase: true },
  });
  const totalRevenue = revenueResult._sum.price_at_purchase ?? 0;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  return {};
}
