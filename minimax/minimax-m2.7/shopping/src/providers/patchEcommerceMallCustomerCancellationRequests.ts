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

export async function patchEcommerceMallCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCancellationRequest.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    cancellationRequest: {
      ecommerce_mall_customer_id: props.customer.id,
    },
    ...(props.body.status !== undefined && {
      cancellationRequest: {
        ecommerce_mall_customer_id: props.customer.id,
        status: props.body.status,
      },
    }),
    ...(props.body.sellerId !== undefined && {
      cancellationRequest: {
        ecommerce_mall_customer_id: props.customer.id,
        ...(props.body.status !== undefined && { status: props.body.status }),
        ecommerce_mall_seller_id: props.body.sellerId,
      },
    }),
  };
  const records =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findMany(
      {
        ...EcommerceMallCancellationRequestAtSummaryTransformer.select(),
        where: {
          cancellationRequest: {
            ecommerce_mall_customer_id: props.customer.id,
            ...(props.body.status !== undefined && {
              status: props.body.status,
            }),
            ...(props.body.sellerId !== undefined && {
              ecommerce_mall_seller_id: props.body.sellerId,
            }),
          },
        },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      },
    );
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.count({
      where: {
        cancellationRequest: {
          ecommerce_mall_customer_id: props.customer.id,
          ...(props.body.status !== undefined && { status: props.body.status }),
          ...(props.body.sellerId !== undefined && {
            ecommerce_mall_seller_id: props.body.sellerId,
          }),
        },
      },
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await EcommerceMallCancellationRequestAtSummaryTransformer.transformAll(
      records,
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
// import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
// import { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallCustomerCancellationRequests(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallCancellationRequest.IRequest;
// }): Promise<IPageIEcommerceMallCancellationRequest.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findMany({
//     ...EcommerceMallCancellationRequestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await EcommerceMallCancellationRequestAtSummaryTransformer.transformAll(records),
//   };
// }
// ```
//--------------------------------------------------------------