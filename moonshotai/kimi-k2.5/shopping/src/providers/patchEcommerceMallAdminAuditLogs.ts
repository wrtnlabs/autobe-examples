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

export async function patchEcommerceMallAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdminAuditLog.IRequest;
}): Promise<IPageIEcommerceMallAdminAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const filterConditions: Prisma.ecommerce_mall_admin_audit_logsWhereInput[] =
    [];
  if (props.body.adminId !== undefined && props.body.adminId !== null) {
    filterConditions.push({ ecommerce_mall_admin_id: props.body.adminId });
  }
  if (
    props.body.actionTypes !== undefined &&
    props.body.actionTypes !== null &&
    props.body.actionTypes.length > 0
  ) {
    filterConditions.push({ action: { in: props.body.actionTypes } });
  }
  if (
    props.body.resourceTypes !== undefined &&
    props.body.resourceTypes !== null &&
    props.body.resourceTypes.length > 0
  ) {
    filterConditions.push({ resource_type: { in: props.body.resourceTypes } });
  }
  if (props.body.resourceId !== undefined && props.body.resourceId !== null) {
    filterConditions.push({ resource_id: props.body.resourceId });
  }
  if (props.body.ipAddress !== undefined && props.body.ipAddress !== null) {
    filterConditions.push({ ip: { contains: props.body.ipAddress } });
  }
  if (
    (props.body.dateFrom !== undefined && props.body.dateFrom !== null) ||
    (props.body.dateTo !== undefined && props.body.dateTo !== null)
  ) {
    filterConditions.push({
      created_at: {
        ...(props.body.dateFrom !== undefined && props.body.dateFrom !== null
          ? { gte: props.body.dateFrom }
          : {}),
        ...(props.body.dateTo !== undefined && props.body.dateTo !== null
          ? { lte: props.body.dateTo }
          : {}),
      },
    });
  }
  const hasCursor =
    props.body.createdAt !== undefined &&
    props.body.createdAt !== null &&
    props.body.id !== undefined &&
    props.body.id !== null;
  const cursorCondition: Prisma.ecommerce_mall_admin_audit_logsWhereInput | null =
    hasCursor
      ? {
          OR: [
            { created_at: { lt: props.body.createdAt } },
            {
              created_at: props.body.createdAt,
              id: { lt: props.body.id },
            },
          ],
        }
      : null;
  const whereInput: Prisma.ecommerce_mall_admin_audit_logsWhereInput = {
    AND: [
      ...(filterConditions.length > 0 ? filterConditions : []),
      ...(cursorCondition !== null ? [cursorCondition] : []),
    ],
  };
  const records =
    await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.findMany({
      where: whereInput,
      ...(hasCursor ? {} : { skip: (page - 1) * limit }),
      take: limit,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      ...EcommerceMallAdminAuditLogAtSummaryTransformer.select(),
    });
  const filterWhereInput: Prisma.ecommerce_mall_admin_audit_logsWhereInput =
    filterConditions.length > 0 ? { AND: filterConditions } : {};
  const total = await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.count({
    where: filterWhereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallAdminAuditLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
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
// import { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
// import { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminAuditLogs(props: {
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