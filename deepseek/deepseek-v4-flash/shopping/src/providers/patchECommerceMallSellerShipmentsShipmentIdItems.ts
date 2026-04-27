import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ECommerceMallShipmentItemAtSummaryTransformer } from "../transformers/ECommerceMallShipmentItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallSellerShipmentsShipmentIdItems(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IECommerceMallShipmentItem.IRequest;
}): Promise<IPageIECommerceMallShipmentItem.ISummary> {
  const shipment =
    await MyGlobal.prisma.e_commerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: { id: true, seller_id: true },
    });
  if (shipment.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.e_commerce_mall_shipment_itemsWhereInput = {
    shipment_id: props.shipmentId,
  };
  const orderItemWhere: Prisma.e_commerce_mall_order_itemsWhereInput = {};
  if (props.body.search !== undefined) {
    orderItemWhere.productVariantSnapshot = {
      product_name: {
        contains: props.body.search,
        mode: "insensitive",
      },
    };
  }
  if (props.body.status !== undefined) {
    orderItemWhere.status = props.body.status;
  }
  if (props.body.search !== undefined || props.body.status !== undefined) {
    where.orderItem = orderItemWhere;
  }
  if (
    props.body.startCreatedAt !== undefined &&
    props.body.endCreatedAt !== undefined
  ) {
    where.created_at = {
      gte: props.body.startCreatedAt,
      lt: props.body.endCreatedAt,
    };
  } else if (props.body.startCreatedAt !== undefined) {
    where.created_at = {
      gte: props.body.startCreatedAt,
    };
  } else if (props.body.endCreatedAt !== undefined) {
    where.created_at = {
      lt: props.body.endCreatedAt,
    };
  }
  const records = await MyGlobal.prisma.e_commerce_mall_shipment_items.findMany(
    {
      ...ECommerceMallShipmentItemAtSummaryTransformer.select(),
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    },
  );
  const total = await MyGlobal.prisma.e_commerce_mall_shipment_items.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ECommerceMallShipmentItemAtSummaryTransformer.transform,
    ),
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
// import { IECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipmentItem";
// import { IPageIECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallShipmentItem";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
// import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallSellerShipmentsShipmentIdItems(props: {
//   seller: SellerPayload;
//   shipmentId: string & tags.Format<"uuid">;
//   body: IECommerceMallShipmentItem.IRequest;
// }): Promise<IPageIECommerceMallShipmentItem.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_shipment_items.findMany({
//     ...ECommerceMallShipmentItemAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallShipmentItemAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------