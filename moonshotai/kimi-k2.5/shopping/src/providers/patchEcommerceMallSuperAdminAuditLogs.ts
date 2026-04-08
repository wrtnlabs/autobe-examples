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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminAuditLogAtSummaryTransformer } from "../transformers/EcommerceMallAdminAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminAuditLogs(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallAdminAuditLog.IRequest;
}): Promise<IPageIEcommerceMallAdminAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const buildAdminWhere =
    (): Prisma.ecommerce_mall_admin_audit_logsWhereInput => {
      const conditions: Prisma.ecommerce_mall_admin_audit_logsWhereInput[] = [];
      if (props.body.adminId !== null) {
        conditions.push({ ecommerce_mall_admin_id: props.body.adminId });
      }
      if (
        props.body.actionTypes !== null &&
        props.body.actionTypes.length > 0
      ) {
        conditions.push({ action: { in: props.body.actionTypes } });
      }
      if (
        props.body.resourceTypes !== null &&
        props.body.resourceTypes.length > 0
      ) {
        conditions.push({ resource_type: { in: props.body.resourceTypes } });
      }
      if (props.body.resourceId !== null) {
        conditions.push({ resource_id: props.body.resourceId });
      }
      if (props.body.ipAddress !== null) {
        conditions.push({ ip: { contains: props.body.ipAddress } });
      }
      if (props.body.dateFrom !== null) {
        conditions.push({ created_at: { gte: props.body.dateFrom } });
      }
      if (props.body.dateTo !== null) {
        conditions.push({ created_at: { lte: props.body.dateTo } });
      }
      return conditions.length === 1
        ? conditions[0]
        : conditions.length > 1
          ? { AND: conditions }
          : {};
    };
  const adminWhere = buildAdminWhere();
  const adminLogs =
    await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.findMany({
      where: adminWhere,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      ...EcommerceMallAdminAuditLogAtSummaryTransformer.select(),
    });
  const adminTotal =
    await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.count({
      where: adminWhere,
    });
  const transformedData = await ArrayUtil.asyncMap(
    adminLogs,
    EcommerceMallAdminAuditLogAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: adminTotal,
      pages: Math.ceil(adminTotal / limit),
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
// export async function patchEcommerceMallSuperAdminAuditLogs(props: {
//   superAdmin: SuperadminPayload;
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