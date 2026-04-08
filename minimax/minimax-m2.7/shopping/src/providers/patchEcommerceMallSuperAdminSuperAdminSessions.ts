import { IEcommerceMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallSuperAdminSessionAtSummaryTransformer } from "../transformers/EcommerceMallSuperAdminSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminSuperAdminSessions(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallSuperAdminSession.IRequest;
}): Promise<IPageIEcommerceMallSuperAdminSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build created_at range filter with ISO string values
  const createdAtFilter: {
    gte?: string;
    lte?: string;
  } = {};
  if (props.body.createdAtFrom !== undefined) {
    createdAtFilter.gte = props.body.createdAtFrom;
  }
  if (props.body.createdAtTo !== undefined) {
    createdAtFilter.lte = props.body.createdAtTo;
  }
  // Build WHERE clause with all filters
  const whereInput = {
    ecommerce_mall_super_admin_id: props.superAdmin.id,
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
    ...(props.body.ip !== undefined && {
      ip: props.body.ip,
    }),
    ...(props.body.status !== undefined && {
      expired_at:
        props.body.status === "active"
          ? { gt: new Date().toISOString() }
          : { lte: new Date().toISOString() },
    }),
  } satisfies Prisma.ecommerce_mall_super_admin_sessionsWhereInput;
  const records =
    await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.findMany({
      where: whereInput,
      skip: skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallSuperAdminSessionAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.count(
    {
      where: whereInput,
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
      EcommerceMallSuperAdminSessionAtSummaryTransformer.transform,
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
// import { IEcommerceMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminSession";
// import { IPageIEcommerceMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdminSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdminSuperAdminSessions(props: {
//   superAdmin: SuperadminPayload;
//   body: IEcommerceMallSuperAdminSession.IRequest;
// }): Promise<IPageIEcommerceMallSuperAdminSession.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.findMany({
//     ...EcommerceMallSuperAdminSessionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallSuperAdminSessionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------