import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_admin_sessionsWhereInput = {
    admin: {
      deleted_at: null,
    },
  };
  if (props.body.adminId !== undefined) {
    whereInput.ecommerce_mall_admin_id = props.body.adminId;
  }
  if (props.body.ip !== undefined) {
    whereInput.ip = {
      contains: props.body.ip,
    };
  }
  if (props.body.createdFrom !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.createdFrom),
    };
  }
  if (props.body.createdTo !== undefined) {
    whereInput.created_at =
      whereInput.created_at !== undefined
        ? {
            ...(whereInput.created_at as Prisma.DateTimeFilter),
            lte: new Date(props.body.createdTo),
          }
        : { lte: new Date(props.body.createdTo) };
  }
  if (props.body.status !== undefined) {
    const now = new Date();
    if (props.body.status === "active") {
      whereInput.expired_at = {
        gt: now,
      };
    } else {
      whereInput.expired_at = {
        lte: now,
      };
    }
  }
  const records = await MyGlobal.prisma.ecommerce_mall_admin_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    ...EcommerceMallAdminSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_admin_sessions.count({
    where: whereInput,
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
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
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