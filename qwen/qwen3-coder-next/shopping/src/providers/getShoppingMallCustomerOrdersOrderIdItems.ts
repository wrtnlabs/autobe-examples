import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderItemAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerOrdersOrderIdItems(props: {
  customer: CustomerPayload;
  orderId: string;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  // Fetch order to verify ownership (customer) or existence (admin)
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { shopping_mall_customer_id: true },
  });
  // Authorization: customer can only access their own orders
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const data = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: { shopping_mall_order_id: props.orderId },
    ...ShoppingMallOrderItemAtSummaryTransformer.select(),
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.shopping_mall_order_items.count({
    where: { shopping_mall_order_id: props.orderId },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallOrderItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: 1,
      limit: total,
      records: total,
      pages: Math.ceil(total / total),
    } satisfies IPage.IPagination,
  };
}
