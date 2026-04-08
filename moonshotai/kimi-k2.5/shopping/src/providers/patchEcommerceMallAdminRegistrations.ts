import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistration";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerRegistrationAtSummaryTransformer } from "../transformers/EcommerceMallSellerRegistrationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminRegistrations(props: {
  admin: AdminPayload;
  body: IEcommerceMallSellerRegistration.IRequest;
}): Promise<IPageIEcommerceMallSellerRegistration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where = {
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.sellerId !== undefined && {
      ecommerce_mall_seller_id: props.body.sellerId,
    }),
    ...(props.body.reviewerId !== undefined && {
      reviewer_id: props.body.reviewerId,
    }),
    ...(props.body.search !== undefined && {
      rejection_reason: { contains: props.body.search },
    }),
    ...(props.body.createdAt !== undefined && {
      created_at: {
        ...(props.body.createdAt.from !== undefined && {
          gte: new Date(props.body.createdAt.from),
        }),
        ...(props.body.createdAt.to !== undefined && {
          lte: new Date(props.body.createdAt.to),
        }),
      },
    }),
  } satisfies Prisma.ecommerce_mall_seller_registrationsWhereInput;
  const records =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallSellerRegistrationAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_mall_seller_registrations.count(
    {
      where,
    },
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallSellerRegistrationAtSummaryTransformer.transform,
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
// import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
// import { IPageIEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistration";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminRegistrations(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallSellerRegistration.IRequest;
// }): Promise<IPageIEcommerceMallSellerRegistration.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_seller_registrations.findMany({
//     ...EcommerceMallSellerRegistrationAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallSellerRegistrationAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------