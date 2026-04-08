import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallMemberOrderItems(props: {
  member: MemberPayload;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  // Build dynamic where clause with member-scoped filtering
  const whereClause: Prisma.ecommerce_mall_order_itemsWhereInput = {
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.order_id && {
      ecommerce_mall_order_id: props.body.order_id,
    }),
    ...(props.body.product_variant_id && {
      ecommerce_mall_product_variant_id: props.body.product_variant_id,
    }),
    ...(props.body.created_at_from && {
      created_at: { gte: props.body.created_at_from },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: props.body.created_at_to },
    }),
    ...(props.body.updated_at_from && {
      updated_at: { gte: props.body.updated_at_from },
    }),
    ...(props.body.updated_at_to && {
      updated_at: { lte: props.body.updated_at_to },
    }),
  } satisfies Prisma.ecommerce_mall_order_itemsWhereInput;
  // Calculate pagination values
  const page = props.body.page ? Number(props.body.page) : 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build orderBy clause
  const orderByInput: Prisma.ecommerce_mall_order_itemsOrderByWithRelationInput[] =
    props.body.order_by
      ? [
          {
            [props.body.order_by]:
              props.body.order_direction === "ASC" ? "asc" : "desc",
          },
        ]
      : [{ created_at: "desc" }];
  // Query records
  const records = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: whereClause,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...EcommerceMallOrderItemAtSummaryTransformer.select(),
  });
  // Query total count
  const total = await MyGlobal.prisma.ecommerce_mall_order_items.count({
    where: whereClause,
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
      EcommerceMallOrderItemAtSummaryTransformer.transform,
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
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallMemberOrderItems(props: {
//   member: MemberPayload;
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