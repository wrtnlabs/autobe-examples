import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEcommerceAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdminAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceAdminAuditLogAtSummaryTransformer } from "../transformers/EcommerceAdminAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IEcommerceAdminAuditLog.IRequest;
}): Promise<IPageIEcommerceAdminAuditLog.ISummary> {
  const {
    action,
    target_entity,
    since,
    until,
    page = 1,
    limit = 10,
  } = props.body;
  const whereInput = {
    deleted_at: null,
    action: action ? { contains: action } : undefined,
    target_entity: target_entity ? { contains: target_entity } : undefined,
    created_at: {
      gte: since ? since : undefined,
      lte: until ? until : undefined,
    },
  } satisfies Prisma.ecommerce_admin_audit_logsWhereInput;
  const data = await MyGlobal.prisma.ecommerce_admin_audit_logs.findMany({
    where: whereInput,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceAdminAuditLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_admin_audit_logs.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceAdminAuditLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceAdminAuditLog.ISummary;
}
