import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
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

export async function getShoppingMallCustomerOrdersOrderIdItemsItemIdSnapshots(props: {
  customer: CustomerPayload;
  orderId: string;
  itemId: string;
}): Promise<IPageIShoppingMallOrderItemSnapshot.ISummary> {
  // Verify order belongs to customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException("Order not found or access denied", 404);
  }
  // Verify order item belongs to the order
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.itemId,
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  // Query snapshots with pagination
  const page = 1;
  const limit = 50;
  const skip = (page - 1) * limit;
  const snapshots =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findMany({
      where: {
        shopping_mall_order_item_id: props.itemId,
      },
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
    });
  const total = await MyGlobal.prisma.shopping_mall_order_item_snapshots.count({
    where: {
      shopping_mall_order_item_id: props.itemId,
    },
  });
  return {
    data: snapshots.map((snapshot) => ({
      id: snapshot.id as string & tags.Format<"uuid">,
      shopping_mall_order_item_id:
        snapshot.shopping_mall_order_item_id as string & tags.Format<"uuid">,
      shopping_mall_sellers_snapshots_id:
        snapshot.shopping_mall_sellers_snapshots_id as string &
          tags.Format<"uuid">,
      product_name: snapshot.product_name,
      product_description:
        snapshot.product_description === null
          ? undefined
          : snapshot.product_description,
      variant_options:
        snapshot.variant_options === null
          ? undefined
          : snapshot.variant_options,
      price: snapshot.price,
      created_at: toISOStringSafe(snapshot.created_at) as string &
        tags.Format<"date-time">,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
