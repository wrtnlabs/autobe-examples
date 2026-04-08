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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallShipmentAtSummaryTransformer } from "../transformers/EcommerceMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallMemberShipments(props: {
  member: MemberPayload;
  body: IEcommerceMallShipment.IRequest;
}): Promise<IPageIEcommerceMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const cursor = props.body.cursor ?? null;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_shipmentsWhereInput = {
    seller_id: props.member.id,
    deleted_at: null,
    ...(props.body.order_id !== undefined && { order_id: props.body.order_id }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.shipped_at_after !== undefined &&
      props.body.shipped_at_after !== null && {
        shipped_at: { gte: new Date(props.body.shipped_at_after) },
      }),
    ...(props.body.shipped_at_before !== null &&
      props.body.shipped_at_before !== undefined && {
        shipped_at: { lte: new Date(props.body.shipped_at_before) },
      }),
    ...(props.body.delivered_at_after !== undefined &&
      props.body.delivered_at_after !== null && {
        delivered_at: { gte: new Date(props.body.delivered_at_after) },
      }),
    ...(props.body.delivered_at_before !== null &&
      props.body.delivered_at_before !== undefined && {
        delivered_at: { lte: new Date(props.body.delivered_at_before) },
      }),
    ...(props.body.created_at_after !== undefined &&
      props.body.created_at_after !== null && {
        created_at: { gte: new Date(props.body.created_at_after) },
      }),
    ...(props.body.created_at_before !== undefined &&
      props.body.created_at_before !== null && {
        created_at: { lte: new Date(props.body.created_at_before) },
      }),
    ...(cursor !== null && { created_at: { lt: new Date(cursor) } }),
  };
  const orderByInput = (
    props.body.sort_field === "shipped_at"
      ? { shipped_at: props.body.sort_direction === "ASC" ? "asc" : "desc" }
      : props.body.sort_field === "delivered_at"
        ? { delivered_at: props.body.sort_direction === "ASC" ? "asc" : "desc" }
        : props.body.sort_field === "status"
          ? { status: props.body.sort_direction === "ASC" ? "asc" : "desc" }
          : { created_at: props.body.sort_direction === "ASC" ? "asc" : "desc" }
  ) satisfies Prisma.ecommerce_mall_shipmentsOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_shipments.findMany({
      where: whereInput,
      orderBy: [orderByInput],
      take: limit,
      skip: skip,
      ...EcommerceMallShipmentAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_shipments.count({ where: whereInput }),
  ]);
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallShipmentAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceMallShipment.ISummary;
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallMemberShipments(props: {
//   member: MemberPayload;
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