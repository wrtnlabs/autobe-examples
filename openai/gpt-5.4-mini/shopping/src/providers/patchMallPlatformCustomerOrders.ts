import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformOrderAtSummaryTransformer } from "../transformers/MallPlatformOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerOrders(props: {
  customer: CustomerPayload;
  body: IMallPlatformOrder.IRequest;
}): Promise<IPageIMallPlatformOrder.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.mall_platform_ordersWhereInput = {
    customer_id: props.customer.id,
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined
              ? { gte: props.body.createdAtFrom }
              : {}),
            ...(props.body.createdAtTo !== undefined
              ? { lte: props.body.createdAtTo }
              : {}),
          },
        }
      : {}),
  };
  const orderBy: Prisma.mall_platform_ordersOrderByWithRelationInput =
    props.body.sort === "createdAtAsc"
      ? { created_at: "asc" }
      : props.body.sort === "totalAmountAsc"
        ? { total_amount: "asc" }
        : props.body.sort === "totalAmountDesc"
          ? { total_amount: "desc" }
          : { created_at: "desc" };
  const records = await MyGlobal.prisma.mall_platform_orders.findMany({
    ...MallPlatformOrderAtSummaryTransformer.select(),
    where,
    orderBy,
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.mall_platform_orders.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformOrderAtSummaryTransformer.transform,
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
// import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
// import { IPageIMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrder";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformCustomerOrders(props: {
//   customer: CustomerPayload;
//   body: IMallPlatformOrder.IRequest;
// }): Promise<IPageIMallPlatformOrder.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_orders.findMany({
//     ...MallPlatformOrderAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformOrderAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------