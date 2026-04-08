import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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

export async function patchEcommerceMallAdminAdminShipments(props: {
  admin: AdminPayload;
  body: IEcommerceMallShipment.IRequest;
}): Promise<IPageIEcommerceMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause with filters
  const whereInput = {
    deleted_at: props.body.includeDeleted ? undefined : null,
    ...(props.body.orderId && {
      ecommerce_mall_order_id: props.body.orderId,
    }),
    ...(props.body.sellerId && {
      ecommerce_mall_seller_id: props.body.sellerId,
    }),
    ...(props.body.carrier && {
      carrier: { contains: props.body.carrier, mode: "insensitive" },
    }),
    ...(props.body.trackingNumber && {
      tracking_number: {
        contains: props.body.trackingNumber,
        mode: "insensitive",
      },
    }),
    ...(props.body.createdFrom && {
      created_at: { gte: new Date(props.body.createdFrom) },
    }),
    ...(props.body.createdTo && {
      created_at: { lte: new Date(props.body.createdTo) },
    }),
  } satisfies Prisma.ecommerce_mall_shipmentsWhereInput;
  // Build ORDER BY clause
  const sortParam = props.body.sort ?? "created_at:desc";
  const [sortField, sortDirection] = sortParam.split(":") as [
    string,
    "asc" | "desc",
  ];
  const orderByInput = {
    [sortField]: sortDirection,
  } satisfies Prisma.ecommerce_mall_shipmentsOrderByWithRelationInput;
  // Execute paginated query
  const records = await MyGlobal.prisma.ecommerce_mall_shipments.findMany({
    ...EcommerceMallShipmentAtSummaryTransformer.select(),
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
  });
  // Execute count query
  const total = await MyGlobal.prisma.ecommerce_mall_shipments.count({
    where: whereInput,
  });
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
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminAdminShipments(props: {
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