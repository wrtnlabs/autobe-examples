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

export async function patchShoppingMallMemberOrderItems(props: {
  member: MemberPayload;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const uuidOrUndef = (
    v: (string & tags.Format<"uuid">) | undefined,
  ): (string & tags.Format<"uuid">) | undefined => v;
  const shoppingOrderId = uuidOrUndef(props.body.shoppingOrderId);
  const productVariantId = uuidOrUndef(props.body.productVariantId);
  const sellerSnapshotId = uuidOrUndef(props.body.sellerSnapshotId);
  const shipmentId = props.body.shipmentId;
  const allowedStatuses: ReadonlySet<string> = new Set([
    "created",
    "shipped",
    "delivered",
    "cancellation_requested",
    "refund_requested",
    "cancelled",
    "refunded",
  ]);
  if (props.body.lineItemStatus !== undefined) {
    const status = props.body.lineItemStatus;
    if (allowedStatuses.has(status) === false) {
      throw new HttpException("Invalid line item status", 400);
    }
  }
  const sortBy = props.body.sortBy ?? "placed_at";
  const sortDirection = props.body.sortDirection ?? "desc";
  const orderBy =
    sortBy === "placed_at"
      ? ({
          placed_at: sortDirection,
        } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput)
      : sortBy === "created_at"
        ? ({
            created_at: sortDirection,
          } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput)
        : sortBy === "updated_at"
          ? ({
              updated_at: sortDirection,
            } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput)
          : ({
              placed_at: "desc",
            } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput);
  const directionForSecondary = sortDirection === "asc" ? "asc" : "desc";
  const where = {
    deleted_at: null,
    ...(shoppingOrderId !== undefined && {
      shopping_mall_order_id: shoppingOrderId,
    }),
    ...(productVariantId !== undefined && {
      shopping_mall_product_variant_id: productVariantId,
    }),
    ...(sellerSnapshotId !== undefined && {
      seller_snapshot_id: sellerSnapshotId,
    }),
    ...(props.body.lineItemStatus !== undefined && {
      line_item_status: props.body.lineItemStatus,
    }),
    ...(shipmentId !== undefined && {
      shopping_mall_shipment_id:
        shipmentId === null
          ? null
          : (shipmentId as string & tags.Format<"uuid">),
    }),
    ...(props.body.placedAtFrom !== undefined ||
    props.body.placedAtTo !== undefined
      ? {
          placed_at: {
            ...(props.body.placedAtFrom !== undefined && {
              gte: new Date(props.body.placedAtFrom),
            }),
            ...(props.body.placedAtTo !== undefined && {
              lte: new Date(props.body.placedAtTo),
            }),
          },
        }
      : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined && {
              gte: new Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo !== undefined && {
              lte: new Date(props.body.createdAtTo),
            }),
          },
        }
      : {}),
    ...(props.body.updatedAtFrom !== undefined ||
    props.body.updatedAtTo !== undefined
      ? {
          updated_at: {
            ...(props.body.updatedAtFrom !== undefined && {
              gte: new Date(props.body.updatedAtFrom),
            }),
            ...(props.body.updatedAtTo !== undefined && {
              lte: new Date(props.body.updatedAtTo),
            }),
          },
        }
      : {}),
    order: {
      deleted_at: null,
      customer: {
        id: props.member.id,
        deleted_at: null,
      },
    },
  } satisfies Prisma.shopping_mall_order_itemsWhereInput;
  const skip = (page - 1) * limit;
  const [items, total] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        {
          ...(orderBy as unknown as Prisma.shopping_mall_order_itemsOrderByWithRelationInput),
        },
        { created_at: directionForSecondary },
      ],
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
    data: items.map((r) => ({
      id: r.id,
      shopping_mall_order_id: r.shopping_mall_order_id,
      shopping_mall_product_variant_id: r.shopping_mall_product_variant_id,
      seller_snapshot_id: r.seller_snapshot_id,
      shopping_mall_shipment_id: r.shopping_mall_shipment_id,
      seller_price_at_purchase: r.seller_price_at_purchase,
      quantity: r.quantity,
      line_item_status: r.line_item_status,
      placed_at: r.placed_at.toISOString() as string & tags.Format<"date-time">,
      created_at: r.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updated_at: r.updated_at.toISOString() as string &
        tags.Format<"date-time">,
      deleted_at:
        r.deleted_at === null
          ? null
          : (r.deleted_at.toISOString() as string & tags.Format<"date-time">),
    })) satisfies IShoppingMallOrderItem.ISummary[],
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
