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
  // Build WHERE clause for order items
  const whereInput: Prisma.shopping_mall_order_itemsWhereInput = {
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.orderId && { shopping_mall_order_id: props.body.orderId }),
    ...(props.body.createdAtFrom && {
      created_at: {
        gte: new Date(props.body.createdAtFrom),
      },
    }),
    ...(props.body.createdAtTo && {
      created_at: {
        lte: new Date(props.body.createdAtTo),
      },
    }),
    ...(props.body.priceMin !== undefined && {
      price: {
        gte: props.body.priceMin,
      },
    }),
    ...(props.body.priceMax !== undefined && {
      price: {
        lte: props.body.priceMax,
      },
    }),
    ...(props.body.quantityMin !== undefined && {
      quantity: {
        gte: props.body.quantityMin,
      },
    }),
    ...(props.body.quantityMax !== undefined && {
      quantity: {
        lte: props.body.quantityMax,
      },
    }),
  };
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Sort parameters
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.shopping_mall_order_itemsOrderByWithRelationInput =
    {
      [sortBy]: sortOrder,
    };
  // Get shipment item IDs for this shipment
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
  // If no items in shipment, return empty page
  if (orderItemIds.length === 0) {
    return {
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    };
  }
  // Add shipment filter to WHERE clause
  const finalWhereInput: Prisma.shopping_mall_order_itemsWhereInput = {
    ...whereInput,
    id: {
      in: orderItemIds,
    },
  };
  // Query order items with pagination
  const data = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: finalWhereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallOrderItemAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.shopping_mall_order_items.count({
    where: finalWhereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallOrderItemAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
