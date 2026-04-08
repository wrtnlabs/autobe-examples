import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminAuditLogAtSummaryTransformer } from "../transformers/EcommerceMallAdminAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdminAuditLog.IRequest;
}): Promise<IPageIEcommerceMallAdminAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.ecommerceMallAdminId !== undefined && {
      ecommerce_mall_admin_id: props.body.ecommerceMallAdminId,
    }),
    ...(props.body.action !== undefined && {
      action: props.body.action,
    }),
    ...(props.body.resourceType !== undefined && {
      resource_type: props.body.resourceType,
    }),
    ...(props.body.resourceId !== undefined && {
      resource_id: props.body.resourceId,
    }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: {
        gte: new Date(props.body.createdAtFrom),
      },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: {
        lte: new Date(props.body.createdAtTo),
      },
    }),
  } satisfies Prisma.ecommerce_mall_admin_audit_logsWhereInput;
  const records =
    await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.findMany({
      ...EcommerceMallAdminAuditLogAtSummaryTransformer.select(),
      where: whereInput,
      skip: skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
    });
  const total = await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.count({
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
      EcommerceMallAdminAuditLogAtSummaryTransformer.transform,
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
// import { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
// import { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminAdminAuditLogs(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallAdminAuditLog.IRequest;
// }): Promise<IPageIEcommerceMallAdminAuditLog.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.findMany({
//     ...EcommerceMallAdminAuditLogAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallAdminAuditLogAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------