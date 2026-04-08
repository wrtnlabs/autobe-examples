import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { IErpHrmAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdminAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmAdminAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmAdminAuditLogAtSummaryTransformer } from "../transformers/ErpHrmAdminAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IErpHrmAdminAuditLog.IRequest;
}): Promise<IPageIErpHrmAdminAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereCondition: Prisma.erp_hrm_admin_audit_logsWhereInput = {};
  if (props.body.actionType !== undefined) {
    whereCondition.action_type = props.body.actionType;
  }
  if (props.body.adminId !== undefined) {
    whereCondition.erp_hrm_admin_id = props.body.adminId;
  }
  if (props.body.targetEntity !== undefined) {
    whereCondition.target_entity = props.body.targetEntity;
  }
  if (props.body.targetId !== undefined) {
    whereCondition.target_id = props.body.targetId;
  }
  if (
    props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
  ) {
    whereCondition.created_at = {};
    if (props.body.createdAtFrom !== undefined) {
      whereCondition.created_at.gte = props.body.createdAtFrom;
    }
    if (props.body.createdAtTo !== undefined) {
      whereCondition.created_at.lte = props.body.createdAtTo;
    }
  }
  if (props.body.ipAddress !== undefined) {
    whereCondition.ip_address = props.body.ipAddress;
  }
  const records = await MyGlobal.prisma.erp_hrm_admin_audit_logs.findMany({
    where: whereCondition,
    skip: skip,
    take: limit,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    ...ErpHrmAdminAuditLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_admin_audit_logs.count({
    where: whereCondition,
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
      ErpHrmAdminAuditLogAtSummaryTransformer.transform,
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
// import { IErpHrmAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdminAuditLog";
// import { IPageIErpHrmAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmAdminAuditLog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmAdminAuditLogs(props: {
//   admin: AdminPayload;
//   body: IErpHrmAdminAuditLog.IRequest;
// }): Promise<IPageIErpHrmAdminAuditLog.ISummary> {
//   const records = await MyGlobal.prisma.erp_hrm_admin_audit_logs.findMany({
//     ...ErpHrmAdminAuditLogAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ErpHrmAdminAuditLogAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------