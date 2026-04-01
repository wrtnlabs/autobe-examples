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

export async function patchShoppingMallAdminAdminOrderItems(props: {
  admin: AdminPayload;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  if (props.admin.type !== "admin") {
    throw new HttpException("Forbidden", 403);
  }
  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { id: props.admin.id, deleted_at: null },
    select: { id: true },
  });
  if (admin === null) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sortByKey = props.body.sortBy ?? "placed_at";
  const sortDirection = props.body.sortDirection ?? "desc";
  const allowedSortBy = new Set(["placed_at", "created_at", "updated_at"]);
  if (!allowedSortBy.has(sortByKey)) {
    throw new HttpException("Invalid sortBy", 400);
  }
  if (props.body.lineItemStatus === undefined) {
    throw new HttpException("lineItemStatus is required", 400);
  }
  const where = {
    deleted_at: null,
    ...(props.body.shoppingOrderId !== undefined && {
      shopping_mall_order_id: props.body.shoppingOrderId,
    }),
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
    ...(props.body.placedAtFrom !== undefined && {
      placed_at: { gte: new Date(props.body.placedAtFrom) },
    }),
    ...(props.body.placedAtTo !== undefined && {
      placed_at: {
        ...(props.body.placedAtFrom !== undefined
          ? { gte: new Date(props.body.placedAtFrom) }
          : {}),
        lte: new Date(props.body.placedAtTo),
      },
    }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: {
        ...(props.body.createdAtFrom !== undefined
          ? { gte: new Date(props.body.createdAtFrom) }
          : {}),
        lte: new Date(props.body.createdAtTo),
      },
    }),
    ...(props.body.updatedAtFrom !== undefined && {
      updated_at: { gte: new Date(props.body.updatedAtFrom) },
    }),
    ...(props.body.updatedAtTo !== undefined && {
      updated_at: {
        ...(props.body.updatedAtFrom !== undefined
          ? { gte: new Date(props.body.updatedAtFrom) }
          : {}),
        lte: new Date(props.body.updatedAtTo),
      },
    }),
    order: {
      deleted_at: null,
    },
    sellerSnapshot: {
      deleted_at: null,
      snapshotParties: {
        some: {
          deleted_at: null,
          can_view: true,
          party_type: "admin",
          party_id: props.admin.id,
        },
      },
    },
  } satisfies Prisma.shopping_mall_order_itemsWhereInput;
  const orderBy = (() => {
    const dir = sortDirection;
    const primary =
      sortByKey === "placed_at"
        ? { placed_at: dir }
        : sortByKey === "created_at"
          ? { created_at: dir }
          : { updated_at: dir };
    return [primary, { id: "desc" }];
  })() satisfies Array<Prisma.shopping_mall_order_itemsOrderByWithRelationInput>;
  const skip = (page - 1) * limit;
  const [records, total] = await MyGlobal.prisma.$transaction([
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
    data: records.map((record) => ({
      id: record.id,
      shopping_mall_order_id: record.shopping_mall_order_id,
      shopping_mall_product_variant_id: record.shopping_mall_product_variant_id,
      seller_snapshot_id: record.seller_snapshot_id,
      shopping_mall_shipment_id: record.shopping_mall_shipment_id,
      seller_price_at_purchase: record.seller_price_at_purchase,
      quantity: record.quantity,
      line_item_status: record.line_item_status,
      placed_at: toISOStringSafe(record.placed_at),
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at:
        record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
