import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import { IPageIEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminSessionAtSummaryTransformer } from "../transformers/EcommerceMallAdminSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAdminSessions(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdminSession.IRequest;
}): Promise<IPageIEcommerceMallAdminSession.ISummary> {
  const limit = props.body.limit ?? 100;
  const page = props.body.page;
  const cursor = props.body.cursor;
  const whereCondition: Prisma.ecommerce_mall_admin_sessionsWhereInput = {
    ...(props.body.adminId && {
      ecommerce_mall_admin_id: props.body.adminId,
    }),
    ...(props.body.ip && {
      ip: { contains: props.body.ip },
    }),
    ...(props.body.href && {
      href: { contains: props.body.href },
    }),
    ...(props.body.referrer && {
      referrer: { contains: props.body.referrer },
    }),
    ...(props.body.createdAtAfter && {
      created_at: { gte: props.body.createdAtAfter },
    }),
    ...(props.body.createdAtBefore && {
      created_at: { lte: props.body.createdAtBefore },
    }),
    ...(props.body.expiredAtAfter && {
      expired_at: { gte: props.body.expiredAtAfter },
    }),
    ...(props.body.expiredAtBefore && {
      expired_at: { lte: props.body.expiredAtBefore },
    }),
    ...(props.body.isExpired !== undefined && {
      expired_at: props.body.isExpired
        ? { lt: new Date() }
        : { gt: new Date() },
    }),
  };
  let records;
  let total: number;
  let currentPage: number;
  let totalPages: number;
  if (cursor) {
    const cursorRecord =
      await MyGlobal.prisma.ecommerce_mall_admin_sessions.findUnique({
        where: { id: cursor },
        select: { created_at: true, id: true },
      });
    if (!cursorRecord) {
      throw new HttpException("Invalid cursor", 400);
    }
    records = await MyGlobal.prisma.ecommerce_mall_admin_sessions.findMany({
      where: {
        ...whereCondition,
        OR: [
          { created_at: { lt: cursorRecord.created_at } },
          {
            created_at: cursorRecord.created_at,
            id: { lt: cursorRecord.id },
          },
        ],
      },
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallAdminSessionAtSummaryTransformer.select(),
    });
    total = await MyGlobal.prisma.ecommerce_mall_admin_sessions.count({
      where: whereCondition,
    });
    currentPage = page ?? 1;
    totalPages = Math.ceil(total / limit);
  } else {
    const skip = page ? (page - 1) * limit : 0;
    records = await MyGlobal.prisma.ecommerce_mall_admin_sessions.findMany({
      where: whereCondition,
      skip: skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallAdminSessionAtSummaryTransformer.select(),
    });
    total = await MyGlobal.prisma.ecommerce_mall_admin_sessions.count({
      where: whereCondition,
    });
    currentPage = page ?? 1;
    totalPages = Math.ceil(total / limit);
  }
  return {
    pagination: {
      pagination: {
        current: currentPage,
        limit: limit,
        records: total,
        pages: totalPages,
      },
      data: [],
    },
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallAdminSessionAtSummaryTransformer.transform,
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
// import { IEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminSession";
// import { IPageIEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminSession";
// import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminAdminSessions(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallAdminSession.IRequest;
// }): Promise<IPageIEcommerceMallAdminSession.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_admin_sessions.findMany({
//     ...EcommerceMallAdminSessionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallAdminSessionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------