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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_admin_audit_logsWhereInput = {
    deleted_at: null,
    ...(props.body.action_type && { action_type: props.body.action_type }),
    ...(props.body.target_entity && {
      target_entity: props.body.target_entity,
    }),
    ...(props.body.target_id !== undefined && {
      target_id: props.body.target_id,
    }),
    ...(props.body.ecommerce_admin_id && {
      ecommerce_admin_id: props.body.ecommerce_admin_id,
    }),
    ...(props.body.created_at_gte && {
      created_at: {
        gte: new Date(props.body.created_at_gte),
      },
    }),
    ...(props.body.created_at_lte && {
      created_at: {
        lte: new Date(props.body.created_at_lte),
      },
    }),
  };
  const records = await MyGlobal.prisma.ecommerce_admin_audit_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...EcommerceAdminAuditLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_admin_audit_logs.count({
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
      EcommerceAdminAuditLogAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceAdminAuditLog.ISummary;
}
