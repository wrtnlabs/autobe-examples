import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ecommerce_mall_customer_id: props.customer.id,
    ...(props.body.status !== undefined && {
      status: props.body.status.toLowerCase(),
    }),
    ...(props.body.orderNumber !== undefined && {
      order_number: {
        contains: props.body.orderNumber.includes("%")
          ? props.body.orderNumber
          : `%${props.body.orderNumber}%`,
      },
    }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: {
        gte: new Date(props.body.createdAtFrom),
      },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: {
        ...(props.body.createdAtFrom !== undefined && {
          gte: new Date(props.body.createdAtFrom),
        }),
        lte: new Date(props.body.createdAtTo),
      },
    }),
    ...(props.body.minTotal !== undefined && {
      total_amount: {
        gte: props.body.minTotal,
      },
    }),
    ...(props.body.maxTotal !== undefined && {
      total_amount: {
        ...(props.body.minTotal !== undefined && {
          gte: props.body.minTotal,
        }),
        lte: props.body.maxTotal,
      },
    }),
    ...(props.body.city !== undefined && {
      shippingAddress: {
        city: {
          contains: props.body.city.includes("%")
            ? props.body.city
            : `%${props.body.city}%`,
        },
      },
    }),
  } satisfies Prisma.ecommerce_mall_ordersWhereInput;
  const records = await MyGlobal.prisma.ecommerce_mall_orders.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    ...EcommerceMallOrderAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_orders.count({
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
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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