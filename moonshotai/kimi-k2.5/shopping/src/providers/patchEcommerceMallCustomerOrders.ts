import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderAtSummaryTransformer } from "../transformers/EcommerceMallOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IEcommerceMallOrder.IRequest;
}): Promise<IPageIEcommerceMallOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const totalPriceFilter: Prisma.FloatFilter<"ecommerce_mall_orders"> = {};
  if (
    props.body.minTotalPrice !== undefined &&
    props.body.minTotalPrice !== null
  ) {
    totalPriceFilter.gte = props.body.minTotalPrice;
  }
  if (
    props.body.maxTotalPrice !== undefined &&
    props.body.maxTotalPrice !== null
  ) {
    totalPriceFilter.lte = props.body.maxTotalPrice;
  }
  const createdAtFilter: Prisma.DateTimeFilter<"ecommerce_mall_orders"> = {};
  if (
    props.body.createdAfter !== undefined &&
    props.body.createdAfter !== null
  ) {
    createdAtFilter.gte = props.body.createdAfter;
  }
  if (
    props.body.createdBefore !== undefined &&
    props.body.createdBefore !== null
  ) {
    createdAtFilter.lte = props.body.createdBefore;
  }
  const whereInput = {
    shopping_customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.status !== undefined &&
      props.body.status !== null && { status: props.body.status }),
    ...(Object.keys(totalPriceFilter).length > 0 && {
      total_price: totalPriceFilter,
    }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
    ...(props.body.orderNumber !== undefined &&
      props.body.orderNumber !== null && {
        order_number: { contains: props.body.orderNumber },
      }),
  } satisfies Prisma.ecommerce_mall_ordersWhereInput;
  const records = await MyGlobal.prisma.ecommerce_mall_orders.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceMallOrderAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_orders.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallOrderAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
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
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallCustomerOrders(props: {
//   customer: CustomerPayload;
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