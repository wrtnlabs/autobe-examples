import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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

export async function patchShoppingMallAdminOrdersOrderIdOrderItems(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true, deleted_at: true },
  });
  if (order.deleted_at !== null) {
    throw new HttpException("Order not found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sortBy ?? "placed_at";
  const sortDirection = props.body.sortDirection ?? "desc";
  const direction = sortDirection === "asc" ? "asc" : "desc";
  const orderBy: Prisma.shopping_mall_order_itemsOrderByWithRelationInput =
    sortBy === "placed_at"
      ? { placed_at: direction }
      : sortBy === "created_at"
        ? { created_at: direction }
        : sortBy === "updated_at"
          ? { updated_at: direction }
          : { placed_at: "desc" };
  const where = {
    shopping_mall_order_id: props.orderId,
    deleted_at: null,
  } satisfies Prisma.shopping_mall_order_itemsWhereInput;
  const items = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where,
    skip,
    take: limit,
    orderBy: [orderBy, { created_at: "desc" }],
    select: {
      id: true,
      shopping_mall_order_id: true,
      shopping_mall_product_variant_id: true,
      seller_snapshot_id: true,
      shopping_mall_shipment_id: true,
      seller_price_at_purchase: true,
      quantity: true,
      line_item_status: true,
      placed_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_order_items.count({
    where,
  });
  return {
    data: items.map((item) => ({
      id: item.id,
      shopping_mall_order_id: item.shopping_mall_order_id,
      shopping_mall_product_variant_id: item.shopping_mall_product_variant_id,
      seller_snapshot_id: item.seller_snapshot_id,
      shopping_mall_shipment_id: item.shopping_mall_shipment_id,
      seller_price_at_purchase: item.seller_price_at_purchase,
      quantity: item.quantity,
      line_item_status: item.line_item_status,
      placed_at: toISOStringSafe(item.placed_at),
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at:
        item.deleted_at === null ? null : toISOStringSafe(item.deleted_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
