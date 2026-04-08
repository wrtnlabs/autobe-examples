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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallCustomerSessionAtSummaryTransformer } from "../transformers/EcommerceMallCustomerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminCustomerSessions(props: {
  admin: AdminPayload;
  body: IEcommerceMallCustomerSession.IRequest;
}): Promise<IPageIEcommerceMallCustomerSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const whereConditions: Prisma.ecommerce_mall_customer_sessionsWhereInput[] =
    [];
  if (
    props.body.createdAtFrom !== null &&
    props.body.createdAtFrom !== undefined
  ) {
    whereConditions.push({ created_at: { gte: props.body.createdAtFrom } });
  }
  if (props.body.createdAtTo !== null && props.body.createdAtTo !== undefined) {
    whereConditions.push({ created_at: { lte: props.body.createdAtTo } });
  }
  if (
    props.body.expiredAtFrom !== null &&
    props.body.expiredAtFrom !== undefined
  ) {
    whereConditions.push({ expired_at: { gte: props.body.expiredAtFrom } });
  }
  if (props.body.expiredAtTo !== null && props.body.expiredAtTo !== undefined) {
    whereConditions.push({ expired_at: { lte: props.body.expiredAtTo } });
  }
  if (
    props.body.status !== null &&
    props.body.status !== undefined &&
    props.body.status !== "all"
  ) {
    const nowISO = new Date().toISOString();
    if (props.body.status === "active") {
      whereConditions.push({ expired_at: { gt: nowISO } });
    } else if (props.body.status === "expired") {
      whereConditions.push({ expired_at: { lte: nowISO } });
    }
  }
  if (
    props.body.ip !== null &&
    props.body.ip !== undefined &&
    props.body.ip.length > 0
  ) {
    whereConditions.push({
      ip: { contains: props.body.ip, mode: "insensitive" },
    });
  }
  if (props.body.cursor !== null && props.body.cursor !== undefined) {
    if (sortBy === "created_at") {
      whereConditions.push({
        created_at:
          sortOrder === "asc"
            ? { gt: props.body.cursor }
            : { lt: props.body.cursor },
      });
    } else if (sortBy === "expired_at") {
      whereConditions.push({
        expired_at:
          sortOrder === "asc"
            ? { gt: props.body.cursor }
            : { lt: props.body.cursor },
      });
    }
  }
  const whereInput: Prisma.ecommerce_mall_customer_sessionsWhereInput =
    whereConditions.length > 0 ? { AND: whereConditions } : {};
  const orderBy: Prisma.ecommerce_mall_customer_sessionsOrderByWithRelationInput =
    sortBy === "created_at"
      ? { created_at: sortOrder }
      : { expired_at: sortOrder };
  const records =
    await MyGlobal.prisma.ecommerce_mall_customer_sessions.findMany({
      where: whereInput,
      skip: skip,
      take: limit,
      orderBy: orderBy,
      ...EcommerceMallCustomerSessionAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_mall_customer_sessions.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    records,
    EcommerceMallCustomerSessionAtSummaryTransformer.transform,
  );
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: transformedData,
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
// export async function patchEcommerceMallAdminCustomerSessions(props: {
//   admin: AdminPayload;
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