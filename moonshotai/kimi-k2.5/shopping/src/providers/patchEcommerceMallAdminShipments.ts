import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallShipmentAtSummaryTransformer } from "../transformers/EcommerceMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminShipments(props: {
  admin: AdminPayload;
  body: IEcommerceMallShipment.IRequest;
}): Promise<IPageIEcommerceMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where = {
    ...(props.body.orderId !== null && { order_id: props.body.orderId }),
    ...(props.body.sellerId !== null && { seller_id: props.body.sellerId }),
    ...(props.body.carrierName !== null && {
      carrier_name: { contains: props.body.carrierName },
    }),
    ...(props.body.status === "in_transit" && {
      deliveries: { none: {} },
    }),
    ...(props.body.status === "delivered" && {
      deliveries: { some: {} },
    }),
    ...((props.body.shippedAtFrom !== null ||
      props.body.shippedAtTo !== null) && {
      shipped_at: {
        ...(props.body.shippedAtFrom !== null && {
          gte: new Date(props.body.shippedAtFrom),
        }),
        ...(props.body.shippedAtTo !== null && {
          lte: new Date(props.body.shippedAtTo),
        }),
      },
    }),
    ...(props.body.search !== null && {
      OR: [
        { carrier_name: { contains: props.body.search } },
        { tracking_number: { contains: props.body.search } },
      ],
    }),
  } satisfies Prisma.ecommerce_mall_shipmentsWhereInput;
  const sortField = props.body.sort ?? "shipped_at";
  const sortOrder = props.body.order ?? "desc";
  const orderBy = {
    ...(sortField === "shipped_at" && { shipped_at: sortOrder }),
    ...(sortField === "created_at" && { created_at: sortOrder }),
    ...(sortField === "carrier_name" && { carrier_name: sortOrder }),
  } satisfies Prisma.ecommerce_mall_shipmentsOrderByWithRelationInput;
  const records = await MyGlobal.prisma.ecommerce_mall_shipments.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...EcommerceMallShipmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_shipments.count({ where });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallShipmentAtSummaryTransformer.transform,
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
// import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
// import { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminShipments(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallShipment.IRequest;
// }): Promise<IPageIEcommerceMallShipment.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_shipments.findMany({
//     ...EcommerceMallShipmentAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallShipmentAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------