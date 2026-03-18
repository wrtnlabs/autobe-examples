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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  if (page < 1) {
    throw new HttpException("page must be >= 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("limit must be between 1 and 100", 400);
  }
  const sortBy = props.body.sortBy ?? "placed_at";
  const sortDirection = props.body.sortDirection ?? "desc";
  const orderBy = (() => {
    switch (sortBy) {
      case "placed_at":
        return { placed_at: sortDirection } as const;
      case "created_at":
        return { created_at: sortDirection } as const;
      case "updated_at":
        return { updated_at: sortDirection } as const;
      default:
        throw new HttpException("Unsupported sortBy", 400);
    }
  })();
  const hasAnyDateFilter =
    props.body.placedAtFrom !== undefined ||
    props.body.placedAtTo !== undefined ||
    props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined ||
    props.body.updatedAtFrom !== undefined ||
    props.body.updatedAtTo !== undefined;
  if (hasAnyDateFilter) {
    throw new HttpException("Date range filters are not supported", 400);
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
    ...(props.body.shipmentId !== undefined &&
      props.body.shipmentId !== null && {
        shopping_mall_shipment_id: props.body.shipmentId,
      }),
    ...(props.body.shipmentId === null && {
      shopping_mall_shipment_id: null,
    }),
    ...(props.body.lineItemStatus !== undefined && {
      line_item_status: props.body.lineItemStatus,
    }),
  };
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      deleted_at: null,
      ...(where as any),
      order: {
        deleted_at: null,
      },
      sellerSnapshot: {
        deleted_at: null,
        snapshotParties: {
          some: {
            deleted_at: null,
            can_view: true,
            party_id: props.admin.id,
          },
        },
      },
    },
    orderBy: [{ ...orderBy }, { id: "desc" }],
    skip,
    take: limit,
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
    where: {
      deleted_at: null,
      ...(where as any),
      order: {
        deleted_at: null,
      },
      sellerSnapshot: {
        deleted_at: null,
        snapshotParties: {
          some: {
            deleted_at: null,
            can_view: true,
            party_id: props.admin.id,
          },
        },
      },
    },
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((r) => ({
      id: r.id,
      shopping_mall_order_id: r.shopping_mall_order_id,
      shopping_mall_product_variant_id: r.shopping_mall_product_variant_id,
      seller_snapshot_id: r.seller_snapshot_id,
      shopping_mall_shipment_id: r.shopping_mall_shipment_id,
      seller_price_at_purchase: r.seller_price_at_purchase,
      quantity: r.quantity,
      line_item_status: r.line_item_status,
      placed_at: toISOStringSafe(r.placed_at),
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at: r.deleted_at === null ? null : toISOStringSafe(r.deleted_at),
    })),
  };
}
