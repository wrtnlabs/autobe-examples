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
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (
    props.body.shoppingOrderId !== undefined &&
    props.body.shoppingOrderId !== null &&
    !uuidRegex.test(props.body.shoppingOrderId)
  ) {
    throw new HttpException("Invalid shoppingOrderId", 400);
  }
  if (
    props.body.productVariantId !== undefined &&
    props.body.productVariantId !== null &&
    !uuidRegex.test(props.body.productVariantId)
  ) {
    throw new HttpException("Invalid productVariantId", 400);
  }
  if (
    props.body.sellerSnapshotId !== undefined &&
    props.body.sellerSnapshotId !== null &&
    !uuidRegex.test(props.body.sellerSnapshotId)
  ) {
    throw new HttpException("Invalid sellerSnapshotId", 400);
  }
  if (props.body.shipmentId !== undefined && props.body.shipmentId !== null) {
    if (!uuidRegex.test(props.body.shipmentId)) {
      throw new HttpException("Invalid shipmentId", 400);
    }
  }
  if (props.body.placedAtFrom !== undefined) {
    if (typeof props.body.placedAtFrom !== "string") {
      throw new HttpException("Invalid placedAtFrom", 400);
    }
  }
  if (props.body.placedAtTo !== undefined) {
    if (typeof props.body.placedAtTo !== "string") {
      throw new HttpException("Invalid placedAtTo", 400);
    }
  }
  if (props.body.createdAtFrom !== undefined) {
    if (typeof props.body.createdAtFrom !== "string") {
      throw new HttpException("Invalid createdAtFrom", 400);
    }
  }
  if (props.body.createdAtTo !== undefined) {
    if (typeof props.body.createdAtTo !== "string") {
      throw new HttpException("Invalid createdAtTo", 400);
    }
  }
  if (props.body.updatedAtFrom !== undefined) {
    if (typeof props.body.updatedAtFrom !== "string") {
      throw new HttpException("Invalid updatedAtFrom", 400);
    }
  }
  if (props.body.updatedAtTo !== undefined) {
    if (typeof props.body.updatedAtTo !== "string") {
      throw new HttpException("Invalid updatedAtTo", 400);
    }
  }
  if (props.body.lineItemStatus !== undefined) {
    if (
      props.body.lineItemStatus === "" ||
      props.body.lineItemStatus.length > 64
    ) {
      throw new HttpException("Invalid lineItemStatus", 400);
    }
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const orderByInput = (() => {
    const dir = props.body.sortDirection ?? "desc";
    const sortBy = props.body.sortBy;
    if (sortBy === undefined) {
      return [
        { placed_at: dir as unknown as Prisma.SortOrder },
        { created_at: dir as unknown as Prisma.SortOrder },
        { id: dir as unknown as Prisma.SortOrder },
      ];
    }
    if (sortBy === "placed_at") {
      return [
        { placed_at: dir as unknown as Prisma.SortOrder },
        { created_at: "desc" as unknown as Prisma.SortOrder },
        { id: "desc" as unknown as Prisma.SortOrder },
      ];
    }
    if (sortBy === "created_at") {
      return [
        { created_at: dir as unknown as Prisma.SortOrder },
        { placed_at: "desc" as unknown as Prisma.SortOrder },
        { id: "desc" as unknown as Prisma.SortOrder },
      ];
    }
    if (sortBy === "updated_at") {
      return [
        { updated_at: dir as unknown as Prisma.SortOrder },
        { placed_at: "desc" as unknown as Prisma.SortOrder },
        { id: "desc" as unknown as Prisma.SortOrder },
      ];
    }
    if (sortBy === "seller_price_at_purchase") {
      return [
        { seller_price_at_purchase: dir as unknown as Prisma.SortOrder },
        { placed_at: "desc" as unknown as Prisma.SortOrder },
        { id: "desc" as unknown as Prisma.SortOrder },
      ];
    }
    throw new HttpException("Invalid sortBy", 400);
  })();
  const whereInput = {
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
    ...(props.body.lineItemStatus !== undefined && {
      line_item_status: props.body.lineItemStatus,
    }),
    ...(props.body.placedAtFrom !== undefined ||
    props.body.placedAtTo !== undefined
      ? {
          placed_at: {
            ...(props.body.placedAtFrom !== undefined && {
              gte: props.body.placedAtFrom,
            }),
            ...(props.body.placedAtTo !== undefined && {
              lte: props.body.placedAtTo,
            }),
          },
        }
      : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined && {
              gte: props.body.createdAtFrom,
            }),
            ...(props.body.createdAtTo !== undefined && {
              lte: props.body.createdAtTo,
            }),
          },
        }
      : {}),
    ...(props.body.updatedAtFrom !== undefined ||
    props.body.updatedAtTo !== undefined
      ? {
          updated_at: {
            ...(props.body.updatedAtFrom !== undefined && {
              gte: props.body.updatedAtFrom,
            }),
            ...(props.body.updatedAtTo !== undefined && {
              lte: props.body.updatedAtTo,
            }),
          },
        }
      : {}),
    ...(props.body.shipmentId !== undefined
      ? {
          shopping_mall_shipment_id:
            props.body.shipmentId === null ? null : props.body.shipmentId,
        }
      : {}),
    order: {
      deleted_at: null,
      shopping_customer_id: props.member.id,
    } satisfies Prisma.shopping_mall_ordersWhereInput,
  } satisfies Prisma.shopping_mall_order_itemsWhereInput;
  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
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
    MyGlobal.prisma.shopping_mall_order_items.count({
      where: whereInput,
    }),
  ]);
  return {
    data: items.map((record) => ({
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
    })) as IShoppingMallOrderItem.ISummary[],
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
