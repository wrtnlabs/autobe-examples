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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallOrderAtSummaryTransformer } from "../transformers/EcommerceMallOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerOrders(props: {
  seller: SellerPayload;
  body: IEcommerceMallOrder.IRequest;
}): Promise<IPageIEcommerceMallOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const totalPriceFilter: Prisma.DecimalFilter = {
    ...(props.body.minTotalPrice !== null &&
      props.body.minTotalPrice !== undefined && {
        gte: props.body.minTotalPrice,
      }),
    ...(props.body.maxTotalPrice !== null &&
      props.body.maxTotalPrice !== undefined && {
        lte: props.body.maxTotalPrice,
      }),
  };
  const whereInput: Prisma.ecommerce_mall_ordersWhereInput = {
    deleted_at: null,
    ...(props.body.status !== null &&
      props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.customerId !== null &&
      props.body.customerId !== undefined && {
        customer: { id: props.body.customerId },
      }),
    ...(Object.keys(totalPriceFilter).length > 0 && {
      total_price: totalPriceFilter,
    }),
    ...(props.body.createdAfter !== null &&
      props.body.createdAfter !== undefined && {
        created_at: { gte: new Date(props.body.createdAfter) },
      }),
    ...(props.body.createdBefore !== null &&
      props.body.createdBefore !== undefined && {
        created_at: { lte: new Date(props.body.createdBefore) },
      }),
    ...(props.body.orderNumber !== null &&
      props.body.orderNumber !== undefined && {
        order_number: { contains: props.body.orderNumber },
      }),
    orderItems: {
      some: {
        product: {
          seller: {
            id: props.seller.id,
          },
        },
      },
    },
  };
  const data = await MyGlobal.prisma.ecommerce_mall_orders.findMany({
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
      data,
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
// export async function patchEcommerceMallSellerOrders(props: {
//   seller: SellerPayload;
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