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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminShipmentsShipmentIdItems(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  // Verify shipment exists
  await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
    where: { id: props.shipmentId },
  });
  // Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where conditions for order items via shipment_items junction
  const orderItemWhere: Prisma.ecommerce_mall_order_itemsWhereInput = {
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
  };
  const where: Prisma.ecommerce_mall_shipment_itemsWhereInput = {
    shipment_id: props.shipmentId,
    ...(Object.keys(orderItemWhere).length > 0 && {
      orderItem: orderItemWhere,
    }),
  };
  // Query shipment items with nested order items
  const shipmentItems =
    await MyGlobal.prisma.ecommerce_mall_shipment_items.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        shipment_id: true,
        order_item_id: true,
        created_at: true,
        orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
      } satisfies Prisma.ecommerce_mall_shipment_itemsSelect,
    });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_shipment_items.count({
    where,
  });
  // Transform order items
  const data = await ArrayUtil.asyncMap(
    shipmentItems.map((si) => si.orderItem),
    EcommerceMallOrderItemAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
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
// export async function patchEcommerceMallAdminShipmentsShipmentIdItems(props: {
//   admin: AdminPayload;
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