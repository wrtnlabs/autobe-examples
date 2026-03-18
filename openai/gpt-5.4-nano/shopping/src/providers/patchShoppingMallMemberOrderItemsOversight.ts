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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberOrderItemsOversight(props: {
  member: MemberPayload;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const orderByField = (() => {
    const direction = props.body.sortDirection ?? "desc";
    const sortBy = props.body.sortBy ?? "created_at";
    switch (sortBy) {
      case "placed_at":
        return {
          placed_at: direction,
        } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput;
      case "updated_at":
        return {
          updated_at: direction,
        } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput;
      case "created_at":
      default:
        return {
          created_at: direction,
        } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput;
    }
  })();
  const sellerScoped = await MyGlobal.prisma.shopping_mall_products.count({
    where: { shopping_mall_seller_id: props.member.id, deleted_at: null },
  });
  const where = {
    deleted_at: null,
    ...(props.body.shoppingOrderId
      ? { shopping_mall_order_id: props.body.shoppingOrderId }
      : {}),
    ...(props.body.productVariantId
      ? { shopping_mall_product_variant_id: props.body.productVariantId }
      : {}),
    ...(props.body.sellerSnapshotId
      ? { seller_snapshot_id: props.body.sellerSnapshotId }
      : {}),
    ...(props.body.lineItemStatus
      ? { line_item_status: props.body.lineItemStatus }
      : {}),
    ...(props.body.shipmentId === null
      ? { shopping_mall_shipment_id: null }
      : {}),
    ...(props.body.shipmentId
      ? { shopping_mall_shipment_id: props.body.shipmentId }
      : {}),
    ...(props.body.placedAtFrom
      ? { placed_at: { gte: props.body.placedAtFrom } }
      : {}),
    ...(props.body.placedAtTo
      ? { placed_at: { lte: props.body.placedAtTo } }
      : {}),
    ...(props.body.createdAtFrom
      ? { created_at: { gte: props.body.createdAtFrom } }
      : {}),
    ...(props.body.createdAtTo
      ? { created_at: { lte: props.body.createdAtTo } }
      : {}),
    ...(props.body.updatedAtFrom
      ? { updated_at: { gte: props.body.updatedAtFrom } }
      : {}),
    ...(props.body.updatedAtTo
      ? { updated_at: { lte: props.body.updatedAtTo } }
      : {}),
    ...(sellerScoped > 0
      ? {
          productVariant: {
            product: {
              shopping_mall_seller_id: props.member.id,
            },
          },
        }
      : {}),
    order: {
      deleted_at: null,
    },
    ...(props.body.shipmentId !== undefined || props.body.shipmentId === null
      ? {
          shipment: {
            deleted_at: null,
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_order_itemsWhereInput;
  const itemsQuery = MyGlobal.prisma.shopping_mall_order_items.findMany({
    where,
    skip,
    take: limit,
    orderBy: orderByField,
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
  const totalQuery = MyGlobal.prisma.shopping_mall_order_items.count({ where });
  const [items, total] = await Promise.all([itemsQuery, totalQuery]);
  const data: IShoppingMallOrderItem.ISummary[] = items.map((it) => ({
    id: it.id,
    shopping_mall_order_id: it.shopping_mall_order_id,
    shopping_mall_product_variant_id: it.shopping_mall_product_variant_id,
    seller_snapshot_id: it.seller_snapshot_id,
    shopping_mall_shipment_id: it.shopping_mall_shipment_id,
    seller_price_at_purchase: it.seller_price_at_purchase,
    quantity: it.quantity,
    line_item_status: it.line_item_status,
    placed_at: it.placed_at.toISOString(),
    created_at: it.created_at.toISOString(),
    updated_at: it.updated_at.toISOString(),
    deleted_at: it.deleted_at?.toISOString() ?? null,
  }));
  const pages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPageIShoppingMallOrderItem.ISummary["pagination"],
  };
}
