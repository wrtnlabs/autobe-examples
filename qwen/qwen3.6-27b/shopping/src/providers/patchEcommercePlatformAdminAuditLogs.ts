import { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import { IEcommercePlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformAdminAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommercePlatformAdminAuditLogAtSummaryTransformer } from "../transformers/EcommercePlatformAdminAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IEcommercePlatformAdminAuditLog.IRequest;
}): Promise<IPageIEcommercePlatformAdminAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_platform_admin_audit_logsWhereInput = {
    ...(props.body.action !== undefined && { action: props.body.action }),
    ...(props.body.admin_id !== undefined && {
      ecommerce_platform_admin_id: props.body.admin_id,
    }),
    ...(props.body.target_id !== undefined && {
      target_id: props.body.target_id,
    }),
    ...(props.body.target_type !== undefined && {
      target_type: props.body.target_type,
    }),
    ...(props.body.from_date !== undefined && {
      created_at: { gte: new Date(props.body.from_date) },
    }),
    ...(props.body.to_date !== undefined && {
      created_at: { lte: new Date(props.body.to_date) },
    }),
  } satisfies Prisma.ecommerce_platform_admin_audit_logsWhereInput;
  const records =
    await MyGlobal.prisma.ecommerce_platform_admin_audit_logs.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommercePlatformAdminAuditLogAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_platform_admin_audit_logs.count(
    { where },
  );
  return {
    data: await ArrayUtil.asyncMap(
      records,
      EcommercePlatformAdminAuditLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
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
// import { IEcommercePlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdminAuditLog";
// import { IPageIEcommercePlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformAdminAuditLog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformAdminAuditLogs(props: {
//   admin: AdminPayload;
//   body: IEcommercePlatformAdminAuditLog.IRequest;
// }): Promise<IPageIEcommercePlatformAdminAuditLog.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_admin_audit_logs.findMany({
//     ...EcommercePlatformAdminAuditLogAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformAdminAuditLogAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------