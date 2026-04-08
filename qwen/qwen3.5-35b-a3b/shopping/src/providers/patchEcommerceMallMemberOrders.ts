import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallOrderAtSummaryTransformer } from "../transformers/EcommerceMallOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallMemberOrders(props: {
  member: MemberPayload;
  body: IEcommerceMallOrder.IRequest;
}): Promise<IPageIEcommerceMallOrder.ISummary> {
  // Determine pagination mode and parameters
  const hasCursor =
    props.body.cursor !== undefined && props.body.cursor !== null;
  const take = hasCursor ? 100 : Math.min(props.body.limit ?? 20, 100);
  const skip = hasCursor ? undefined : (props.body.page ?? 1) - 1 * take;
  const cursor = hasCursor ? { id: props.body.cursor } : undefined;
  // Build WHERE clause with member filter and optional filters
  const whereInput: Prisma.ecommerce_mall_ordersWhereInput = {
    ecommerce_mall_member_id: props.member.id,
    deleted_at: null,
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.startDate !== undefined && {
      created_at: {
        gte: new Date(props.body.startDate),
      },
    }),
    ...(props.body.endDate !== undefined && {
      created_at: {
        lte: new Date(props.body.endDate),
      },
    }),
  };
  // Build ORDER BY clause
  const orderByInput: Prisma.ecommerce_mall_ordersOrderByWithRelationInput =
    props.body.sortBy === "total_price"
      ? {
          total_price: props.body.sortOrder === "asc" ? "asc" : "desc",
        }
      : props.body.sortBy === "order_number"
        ? {
            order_number: props.body.sortOrder === "asc" ? "asc" : "desc",
          }
        : {
            created_at: props.body.sortOrder === "asc" ? "asc" : "desc",
          };
  // Execute findMany with transformer select
  const records = await MyGlobal.prisma.ecommerce_mall_orders.findMany({
    ...EcommerceMallOrderAtSummaryTransformer.select(),
    where: whereInput,
    skip,
    take,
    cursor,
    orderBy: orderByInput,
  });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_orders.count({
    where: whereInput,
  });
  // Calculate pagination metadata
  const page = props.body.page ?? 1;
  const limit = hasCursor ? 100 : Math.min(props.body.limit ?? 20, 100);
  const pagination: IPage.IPagination = {
    current: page,
    limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  // Transform records and return
  return {
    pagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallOrderAtSummaryTransformer.transform,
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
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallMemberOrders(props: {
//   member: MemberPayload;
//   body: IEcommerceMallOrder.IRequest;
// }): Promise<IPageIEcommerceMallOrder.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_orders.findMany({
//     ...EcommerceMallOrderAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallOrderAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------