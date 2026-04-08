import { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerSessionAtSummaryTransformer } from "../transformers/EcommerceMallSellerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerSellerSessions(props: {
  seller: SellerPayload;
  body: IEcommerceMallSellerSession.IRequest;
}): Promise<IPageIEcommerceMallSellerSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build date range filter for created_at
  const createdAtFilter = {
    ...(props.body.createdAtFrom !== undefined && {
      gte: props.body.createdAtFrom,
    }),
    ...(props.body.createdAtTo !== undefined && {
      lte: props.body.createdAtTo,
    }),
  };
  // Build status filter based on expired_at comparison with current time
  const now = new Date().toISOString();
  const statusFilter =
    props.body.status === "active"
      ? { gt: props.body.createdAtFrom ? props.body.createdAtFrom : now }
      : props.body.status === "expired"
        ? { lte: now }
        : undefined;
  const whereClause: Prisma.ecommerce_mall_seller_sessionsWhereInput = {
    ecommerce_mall_seller_id: props.seller.id,
    ...(props.body.ip !== undefined && { ip: props.body.ip }),
    ...(props.body.href !== undefined && {
      href: { contains: props.body.href },
    }),
    ...(props.body.referrer !== undefined && { referrer: props.body.referrer }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
    ...(statusFilter !== undefined && { expired_at: statusFilter }),
  };
  const records = await MyGlobal.prisma.ecommerce_mall_seller_sessions.findMany(
    {
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallSellerSessionAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.ecommerce_mall_seller_sessions.count({
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
      EcommerceMallSellerSessionAtSummaryTransformer.transform,
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
// import { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
// import { IPageIEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerSellerSessions(props: {
//   seller: SellerPayload;
//   body: IEcommerceMallSellerSession.IRequest;
// }): Promise<IPageIEcommerceMallSellerSession.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_seller_sessions.findMany({
//     ...EcommerceMallSellerSessionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallSellerSessionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------