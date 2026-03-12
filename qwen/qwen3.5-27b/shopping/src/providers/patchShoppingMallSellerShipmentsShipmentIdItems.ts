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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderItemAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerShipmentsShipmentIdItems(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  // Verify shipment exists and belongs to seller
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: {
        id: props.shipmentId,
        deleted_at: null,
        seller_id: props.seller.id,
      },
    });
  // Get order item IDs from shipment_items junction table
  const shipmentItems =
    await MyGlobal.prisma.shopping_mall_shipment_items.findMany({
      where: {
        shopping_mall_shipment_id: props.shipmentId,
      },
      select: {
        shopping_mall_order_item_id: true,
      },
    });
  const orderItemIds = shipmentItems.map(
    (si) => si.shopping_mall_order_item_id,
  );
  if (orderItemIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: 1,
        limit: 20,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // Build WHERE clause
  const whereInput: Prisma.shopping_mall_order_itemsWhereInput = {
    id: {
      in: orderItemIds,
    },
    deleted_at: null,
  } satisfies Prisma.shopping_mall_order_itemsWhereInput;
  // Apply optional filters from body
  if (props.body.status !== undefined) {
    (whereInput as any).status = props.body.status;
  }
  if (props.body.orderId !== undefined) {
    (whereInput as any).shopping_mall_order_id = props.body.orderId;
  }
  if (props.body.productId !== undefined) {
    (whereInput as any).product_snapshot = {
      path: ["$.id"],
      equals: props.body.productId,
    };
  }
  if (props.body.variantId !== undefined) {
    (whereInput as any).variant_snapshot = {
      path: ["$.id"],
      equals: props.body.variantId,
    };
  }
  if (props.body.createdAtFrom !== undefined) {
    (whereInput as any).created_at = {
      gte: new Date(props.body.createdAtFrom),
    };
  }
  if (props.body.createdAtTo !== undefined) {
    if ((whereInput as any).created_at === undefined) {
      (whereInput as any).created_at = {};
    }
    (whereInput as any).created_at.lte = new Date(props.body.createdAtTo);
  }
  if (props.body.priceMin !== undefined) {
    (whereInput as any).price = {
      gte: props.body.priceMin,
    };
  }
  if (props.body.priceMax !== undefined) {
    if ((whereInput as any).price === undefined) {
      (whereInput as any).price = {};
    }
    (whereInput as any).price.lte = props.body.priceMax;
  }
  if (props.body.quantityMin !== undefined) {
    (whereInput as any).quantity = {
      gte: props.body.quantityMin,
    };
  }
  if (props.body.quantityMax !== undefined) {
    if ((whereInput as any).quantity === undefined) {
      (whereInput as any).quantity = {};
    }
    (whereInput as any).quantity.lte = props.body.quantityMax;
  }
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Sorting
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.shopping_mall_order_itemsOrderByWithRelationInput =
    {
      [sortBy]: sortOrder,
    } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput;
  // Query order items
  const data = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallOrderItemAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.shopping_mall_order_items.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallOrderItemAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
