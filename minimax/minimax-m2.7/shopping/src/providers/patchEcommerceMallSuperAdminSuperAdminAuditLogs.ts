import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdminAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallSuperAdminAuditLogAtSummaryTransformer } from "../transformers/EcommerceMallSuperAdminAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminSuperAdminAuditLogs(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallSuperAdminAuditLog.IRequest;
}): Promise<IPageIEcommerceMallSuperAdminAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_super_admin_audit_logsWhereInput = {
    ...(props.body.action !== undefined && { action: props.body.action }),
    ...(props.body.target_type !== undefined && {
      target_type: props.body.target_type,
    }),
    ...(props.body.target_id !== undefined && {
      target_id: props.body.target_id,
    }),
    ...(props.body.super_admin_id !== undefined && {
      ecommerce_mall_super_admin_id: props.body.super_admin_id,
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
  };
  const orderByInput: Prisma.ecommerce_mall_super_admin_audit_logsOrderByWithRelationInput =
    props.body.sort === "action_asc"
      ? { action: "asc" }
      : props.body.sort === "action_desc"
        ? { action: "desc" }
        : { created_at: "desc" };
  const data =
    await MyGlobal.prisma.ecommerce_mall_super_admin_audit_logs.findMany({
      where: whereInput,
      skip: skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallSuperAdminAuditLogAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_super_admin_audit_logs.count({
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
      data,
      EcommerceMallSuperAdminAuditLogAtSummaryTransformer.transform,
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
// import { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
// import { IPageIEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdminAuditLog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdminSuperAdminAuditLogs(props: {
//   superAdmin: SuperadminPayload;
//   body: IEcommerceMallSuperAdminAuditLog.IRequest;
// }): Promise<IPageIEcommerceMallSuperAdminAuditLog.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_super_admin_audit_logs.findMany({
//     ...EcommerceMallSuperAdminAuditLogAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallSuperAdminAuditLogAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------