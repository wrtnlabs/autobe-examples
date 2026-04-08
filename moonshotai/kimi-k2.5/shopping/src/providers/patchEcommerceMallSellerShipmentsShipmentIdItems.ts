import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerShipmentsShipmentIdItems(props: {
  seller: SellerPayload;
  shipmentId: string;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  // Verify shipment exists and belongs to the seller
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.findFirst({
    where: {
      id: props.shipmentId,
      seller_id: props.seller.id,
    },
  });
  if (shipment === null) {
    throw new HttpException("Shipment not found or access denied", 404);
  }
  // Get order item IDs from shipment_items junction table
  const shipmentItems =
    await MyGlobal.prisma.ecommerce_mall_shipment_items.findMany({
      where: {
        shipment_id: props.shipmentId,
      },
      select: {
        order_item_id: true,
      },
    });
  const orderItemIds = shipmentItems.map((si) => si.order_item_id);
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build date filters
  const dateFilter = {};
  if (props.body.createdAtFrom !== undefined) {
    Object.assign(dateFilter, { gte: props.body.createdAtFrom });
  }
  if (props.body.createdAtTo !== undefined) {
    Object.assign(dateFilter, { lte: props.body.createdAtTo });
  }
  // Build where clause from request filters
  const whereInput = {
    ...(orderItemIds.length > 0
      ? { id: { in: orderItemIds } }
      : { id: { in: [] } }),
    ...(props.body.orderId !== undefined && { order_id: props.body.orderId }),
    ...(props.body.productId !== undefined && {
      product_id: props.body.productId,
    }),
    ...(props.body.variantId !== undefined && {
      variant_id: props.body.variantId,
    }),
    ...(props.body.sellerId !== undefined && {
      seller_id: props.body.sellerId,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(Object.keys(dateFilter).length > 0 && { created_at: dateFilter }),
  } satisfies Prisma.ecommerce_mall_order_itemsWhereInput;
  // Query order items with filters and pagination
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: whereInput,
      ...EcommerceMallOrderItemAtSummaryTransformer.select(),
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
    }),
    MyGlobal.prisma.ecommerce_mall_order_items.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallOrderItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerShipmentsShipmentIdItems(props: {
//   seller: SellerPayload;
//   shipmentId: string;
//   body: IEcommerceMallOrderItem.IRequest;
// }): Promise<IPageIEcommerceMallOrderItem.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
//     ...EcommerceMallOrderItemAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallOrderItemAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------