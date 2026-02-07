import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
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

export async function getShoppingMallAdminOrderStatus(props: {
  admin: AdminPayload;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  // Query orders with required fields
  const data = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: { deleted_at: null },
    select: {
      id: true,
      order_number: true,
      status: true,
      created_at: true,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.shopping_mall_orders.count({
    where: { deleted_at: null },
  });
  // Transform data to match IShoppingMallOrder.ISummary with proper date conversion
  const transformedData = data.map((order) => ({
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    created_at: toISOStringSafe(order.created_at),
  }));
  // Construct page response with correct types
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
