import { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallCustomerSessionAtSummaryTransformer } from "../transformers/EcommerceMallCustomerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerSessions(props: {
  seller: SellerPayload;
  body: IEcommerceMallCustomerSession.IRequest;
}): Promise<IPageIEcommerceMallCustomerSession.ISummary> {
  const { body } = props;
  const limit = body.limit ?? 20;
  const page = body.page ?? 1;
  const sortBy = body.sortBy ?? "created_at";
  const sortOrder = body.sortOrder ?? "desc";
  const whereConditions: Prisma.ecommerce_mall_customer_sessionsWhereInput[] =
    [];
  if (body.createdAtFrom) {
    whereConditions.push({ created_at: { gte: new Date(body.createdAtFrom) } });
  }
  if (body.createdAtTo) {
    whereConditions.push({ created_at: { lte: new Date(body.createdAtTo) } });
  }
  if (body.expiredAtFrom) {
    whereConditions.push({ expired_at: { gte: new Date(body.expiredAtFrom) } });
  }
  if (body.expiredAtTo) {
    whereConditions.push({ expired_at: { lte: new Date(body.expiredAtTo) } });
  }
  if (body.status === "active") {
    whereConditions.push({ expired_at: { gt: new Date() } });
  } else if (body.status === "expired") {
    whereConditions.push({ expired_at: { lte: new Date() } });
  }
  if (body.ip) {
    whereConditions.push({ ip: { contains: body.ip } });
  }
  let skip = (page - 1) * limit;
  if (body.cursor) {
    if (sortOrder === "asc") {
      whereConditions.push({ created_at: { gt: new Date(body.cursor) } });
    } else {
      whereConditions.push({ created_at: { lt: new Date(body.cursor) } });
    }
    skip = 0;
  }
  const where = whereConditions.length > 0 ? { AND: whereConditions } : {};
  const orderBy =
    sortBy === "expired_at"
      ? { expired_at: sortOrder }
      : { created_at: sortOrder };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_customer_sessions.findMany({
      ...EcommerceMallCustomerSessionAtSummaryTransformer.select(),
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ecommerce_mall_customer_sessions.count({ where }),
  ]);
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceMallCustomerSessionAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
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
// import { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
// import { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerSessions(props: {
//   seller: SellerPayload;
//   body: IEcommerceMallCustomerSession.IRequest;
// }): Promise<IPageIEcommerceMallCustomerSession.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_customer_sessions.findMany({
//     ...EcommerceMallCustomerSessionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallCustomerSessionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------