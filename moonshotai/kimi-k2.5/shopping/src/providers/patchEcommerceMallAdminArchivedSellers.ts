import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerAtSummaryTransformer } from "../transformers/EcommerceMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminArchivedSellers(props: {
  admin: AdminPayload;
  body: IEcommerceMallSeller.IArchiveRequest;
}): Promise<IPageIEcommerceMallSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_sellersWhereInput = {
    deleted_at: { not: null },
    ...(props.body.approvalStatus && {
      approval_status: props.body.approvalStatus,
    }),
    ...(props.body.email && {
      email: { contains: props.body.email, mode: "insensitive" },
    }),
    ...(props.body.createdAtFrom || props.body.createdAtTo
      ? {
          created_at: {
            ...(props.body.createdAtFrom && {
              gte: new Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo && {
              lte: new Date(props.body.createdAtTo),
            }),
          },
        }
      : {}),
    ...(props.body.deletedAtFrom || props.body.deletedAtTo
      ? {
          deleted_at: {
            not: null,
            ...(props.body.deletedAtFrom && {
              gte: new Date(props.body.deletedAtFrom),
            }),
            ...(props.body.deletedAtTo && {
              lte: new Date(props.body.deletedAtTo),
            }),
          },
        }
      : {}),
  } satisfies Prisma.ecommerce_mall_sellersWhereInput;
  const records = await MyGlobal.prisma.ecommerce_mall_sellers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { deleted_at: "desc" },
    ...EcommerceMallSellerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_sellers.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallSellerAtSummaryTransformer.transform,
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
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminArchivedSellers(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallSeller.IArchiveRequest;
// }): Promise<IPageIEcommerceMallSeller.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_sellers.findMany({
//     ...EcommerceMallSellerAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallSellerAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------