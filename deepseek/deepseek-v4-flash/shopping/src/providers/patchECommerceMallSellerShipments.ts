import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ECommerceMallShipmentAtSummaryTransformer } from "../transformers/ECommerceMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallSellerShipments(props: {
  seller: SellerPayload;
  body: IECommerceMallShipment.IRequest;
}): Promise<IPageIECommerceMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    seller_id: props.seller.id,
    deleted_at: null,
    ...(props.body.carrierName !== undefined && {
      carrier_name: { contains: props.body.carrierName },
    }),
    ...(props.body.trackingNumber !== undefined && {
      tracking_number: { contains: props.body.trackingNumber },
    }),
    ...((props.body.shippedAtFrom !== undefined ||
      props.body.shippedAtTo !== undefined) && {
      shipped_at: {
        ...(props.body.shippedAtFrom !== undefined && {
          gte: props.body.shippedAtFrom,
        }),
        ...(props.body.shippedAtTo !== undefined && {
          lte: props.body.shippedAtTo,
        }),
      },
    }),
    ...((props.body.deliveredAtFrom !== undefined ||
      props.body.deliveredAtTo !== undefined) && {
      delivered_at: {
        ...(props.body.deliveredAtFrom !== undefined && {
          gte: props.body.deliveredAtFrom,
        }),
        ...(props.body.deliveredAtTo !== undefined && {
          lte: props.body.deliveredAtTo,
        }),
      },
    }),
    ...(props.body.deliveryStatus === "shipped" && {
      delivered_at: null,
    }),
    ...(props.body.deliveryStatus === "delivered" && {
      delivered_at: { not: null },
    }),
  } satisfies Prisma.e_commerce_mall_shipmentsWhereInput;
  const sortValue = props.body.sort ?? "-created_at";
  const descending = sortValue.startsWith("-");
  const fieldName = descending ? sortValue.slice(1) : sortValue;
  const orderBy = {
    [fieldName]: descending
      ? ("desc" satisfies "desc")
      : ("asc" satisfies "asc"),
  } satisfies Prisma.e_commerce_mall_shipmentsOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.e_commerce_mall_shipments.findMany({
      where,
      ...ECommerceMallShipmentAtSummaryTransformer.select(),
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.e_commerce_mall_shipments.count({
      where,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      ECommerceMallShipmentAtSummaryTransformer.transform,
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
// import { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
// import { IPageIECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallShipment";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallSellerShipments(props: {
//   seller: SellerPayload;
//   body: IECommerceMallShipment.IRequest;
// }): Promise<IPageIECommerceMallShipment.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_shipments.findMany({
//     ...ECommerceMallShipmentAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallShipmentAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------