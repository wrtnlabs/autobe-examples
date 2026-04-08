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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminSessionAtSummaryTransformer } from "../transformers/EcommerceMallAdminSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminAdminsAdminIdSessions(props: {
  superAdmin: SuperadminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IEcommerceMallAdminSession.IRequest;
}): Promise<IPageIEcommerceMallAdminSession.ISummary> {
  await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
    where: { id: props.adminId },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const conditions: Prisma.Enumerable<Prisma.ecommerce_mall_admin_sessionsWhereInput> =
    [
      { ecommerce_mall_admin_id: props.adminId },
      { admin: { deleted_at: null } },
    ];
  if (props.body.ip !== undefined) {
    conditions.push({ ip: { contains: props.body.ip } });
  }
  if (props.body.href !== undefined) {
    conditions.push({ href: { contains: props.body.href } });
  }
  if (props.body.referrer !== undefined) {
    conditions.push({ referrer: { contains: props.body.referrer } });
  }
  if (props.body.createdAtAfter !== undefined) {
    conditions.push({ created_at: { gte: props.body.createdAtAfter } });
  }
  if (props.body.createdAtBefore !== undefined) {
    conditions.push({ created_at: { lte: props.body.createdAtBefore } });
  }
  if (props.body.expiredAtAfter !== undefined) {
    conditions.push({ expired_at: { gte: props.body.expiredAtAfter } });
  }
  if (props.body.expiredAtBefore !== undefined) {
    conditions.push({ expired_at: { lte: props.body.expiredAtBefore } });
  }
  if (props.body.isExpired !== undefined) {
    const now = new Date();
    if (props.body.isExpired) {
      conditions.push({ expired_at: { lt: now } });
    } else {
      conditions.push({ expired_at: { gt: now } });
    }
  }
  const whereInput = {
    AND: conditions,
  } satisfies Prisma.ecommerce_mall_admin_sessionsWhereInput;
  const records = await MyGlobal.prisma.ecommerce_mall_admin_sessions.findMany({
    where: whereInput,
    skip: skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceMallAdminSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_admin_sessions.count({
    where: whereInput,
  });
  return {
    pagination: {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
      data: [],
    } satisfies IPageIEcommerceMall.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallAdminSessionAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceMallAdminSession.ISummary;
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
// export async function patchEcommerceMallSuperAdminAdminsAdminIdSessions(props: {
//   superAdmin: SuperadminPayload;
//   adminId: string & tags.Format<"uuid">;
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