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
  // Build where conditions
  const where: Prisma.ecommerce_mall_admin_audit_logsWhereInput = {};
  if (props.body.adminId !== null) {
    where.ecommerce_mall_admin_id = props.body.adminId;
  }
  if (props.body.actionTypes !== null && props.body.actionTypes.length > 0) {
    where.action = { in: props.body.actionTypes };
  }
  if (
    props.body.resourceTypes !== null &&
    props.body.resourceTypes.length > 0
  ) {
    where.resource_type = { in: props.body.resourceTypes };
  }
  if (props.body.resourceId !== null) {
    where.resource_id = props.body.resourceId;
  }
  if (props.body.ipAddress !== null) {
    where.ip = props.body.ipAddress;
  }
  if (props.body.dateFrom !== null || props.body.dateTo !== null) {
    where.created_at = {};
    if (props.body.dateFrom !== null) {
      where.created_at.gte = new Date(props.body.dateFrom);
    }
    if (props.body.dateTo !== null) {
      where.created_at.lte = new Date(props.body.dateTo);
    }
  }
  // Query admin audit logs
  const [adminLogs, totalCount] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_admin_audit_logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      ...EcommerceMallAdminAuditLogAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_admin_audit_logs.count({ where }),
  ]);
  const data = await ArrayUtil.asyncMap(
    adminLogs,
    EcommerceMallAdminAuditLogAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    } satisfies IPage.IPagination,
  };
}
