import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerDashboard(props: {
  customer: CustomerPayload;
}): Promise<IShoppingMallAdmin.ISummary> {
  const customer_id = props.customer.id;
  const [totalProducts] = await Promise.all([
    MyGlobal.prisma.shopping_mall_products.count({
      where: { seller_id: customer_id, deleted_at: null },
    }),
  ]);
  const [totalOrderItems] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.count({
      where: { shopping_mall_seller_id: customer_id },
    }),
  ]);
  const [pendingCancellations] = await Promise.all([
    MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: { customer_id, status: "pending" },
    }),
  ]);
  const [pendingRefunds] = await Promise.all([
    MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: { customer_id, status: "pending" },
    }),
  ]);
  return {
    total_customers: 0,
    total_sellers: 0,
    total_products: totalProducts,
    total_orders: totalOrderItems,
    pending_seller_approvals: 0,
    pending_cancellation_requests: pendingCancellations,
    pending_refund_requests: pendingRefunds,
  };
}
