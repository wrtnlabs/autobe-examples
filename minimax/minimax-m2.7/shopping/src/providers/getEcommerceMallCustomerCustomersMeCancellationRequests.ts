import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCancellationRequestAtSummaryTransformer } from "../transformers/EcommerceMallCancellationRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerCustomersMeCancellationRequests(props: {
  customer: CustomerPayload;
  page?: number & tags.Type<"int32"> & tags.Minimum<1>;
  limit?: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>;
  status?: "pending" | "approved" | "rejected";
  createdFrom?: string & tags.Format<"date-time">;
  createdTo?: string & tags.Format<"date-time">;
}): Promise<IPageIEcommerceMallCancellationRequest> {
  const page = props.page ?? (1 as const);
  const limit = Math.min(props.limit ?? (20 as const), 100);
  const skip = (page - 1) * limit;
  const whereCondition: Prisma.ecommerce_mall_cancellation_requestsWhereInput =
    {
      ecommerce_mall_customer_id: props.customer.id,
      ...(props.status !== undefined && { status: props.status }),
      ...(props.createdFrom !== undefined && {
        created_at: {
          gte: props.createdFrom,
        },
      }),
      ...(props.createdTo !== undefined && {
        created_at: {
          lte: props.createdTo,
        },
      }),
    };
  const data =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where: whereCondition,
      skip: skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallCancellationRequestAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: whereCondition,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallCancellationRequestAtSummaryTransformer.transform,
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
// import { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallCustomerCustomersMeCancellationRequests(props: {
//   customer: CustomerPayload;
// }): Promise<IPageIEcommerceMallCancellationRequest> {
//   const records = await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
//     ...EcommerceMallCancellationRequestTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallCancellationRequestTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------