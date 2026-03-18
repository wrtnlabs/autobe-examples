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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  if (
    props.body.shoppingOrderId !== undefined &&
    props.body.shoppingOrderId !== props.orderId
  ) {
    throw new HttpException("Bad Request", 400);
  }
  const placedAt = (() => {
    const gte = props.body.placedAtFrom;
    const lte = props.body.placedAtTo;
    if (gte === undefined && lte === undefined) return undefined;
    return {
      ...(gte !== undefined && { gte }),
      ...(lte !== undefined && { lte }),
    } satisfies {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  })();
  const createdAt = (() => {
    const gte = props.body.createdAtFrom;
    const lte = props.body.createdAtTo;
    if (gte === undefined && lte === undefined) return undefined;
    return {
      ...(gte !== undefined && { gte }),
      ...(lte !== undefined && { lte }),
    } satisfies {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  })();
  const updatedAt = (() => {
    const gte = props.body.updatedAtFrom;
    const lte = props.body.updatedAtTo;
    if (gte === undefined && lte === undefined) return undefined;
    return {
      ...(gte !== undefined && { gte }),
      ...(lte !== undefined && { lte }),
    } satisfies {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  })();
  const where = {
    deleted_at: null,
    shopping_mall_order_id: props.orderId,
    ...(props.body.productVariantId !== undefined && {
      shopping_mall_product_variant_id: props.body.productVariantId,
    }),
    ...(props.body.sellerSnapshotId !== undefined && {
      seller_snapshot_id: props.body.sellerSnapshotId,
    }),
    ...(props.body.shipmentId !== undefined && {
      shopping_mall_shipment_id:
        props.body.shipmentId === null ? null : props.body.shipmentId,
    }),
    ...(props.body.lineItemStatus !== undefined && {
      line_item_status: props.body.lineItemStatus,
    }),
    ...(placedAt !== undefined && { placed_at: placedAt }),
    ...(createdAt !== undefined && { created_at: createdAt }),
    ...(updatedAt !== undefined && { updated_at: updatedAt }),
  } satisfies Prisma.shopping_mall_order_itemsWhereInput;
  await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true, deleted_at: true },
  });
  const orderBy: Prisma.shopping_mall_order_itemsOrderByWithRelationInput =
    (() => {
      const sortDirection = props.body.sortDirection ?? "desc";
      const dir: Prisma.SortOrder = sortDirection === "asc" ? "asc" : "desc";
      switch (props.body.sortBy) {
        case "placed_at":
          return { placed_at: dir };
        case "created_at":
          return { created_at: dir };
        case "updated_at":
          return { updated_at: dir };
        default:
          return { placed_at: dir };
      }
    })();
  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where,
      skip,
      take: limit,
      orderBy,
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
    }),
    MyGlobal.prisma.shopping_mall_order_items.count({ where }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: items.map(
      (it) =>
        ({
          id: it.id,
          shopping_mall_order_id: it.shopping_mall_order_id,
          shopping_mall_product_variant_id: it.shopping_mall_product_variant_id,
          seller_snapshot_id: it.seller_snapshot_id,
          shopping_mall_shipment_id: it.shopping_mall_shipment_id,
          seller_price_at_purchase: it.seller_price_at_purchase,
          quantity: it.quantity as number & tags.Type<"int32">,
          line_item_status: it.line_item_status,
          placed_at: toISOStringSafe(it.placed_at),
          created_at: toISOStringSafe(it.created_at),
          updated_at: toISOStringSafe(it.updated_at),
          deleted_at:
            it.deleted_at === null ? null : toISOStringSafe(it.deleted_at),
        }) satisfies IShoppingMallOrderItem.ISummary,
    ),
  } satisfies IPageIShoppingMallOrderItem.ISummary;
}
