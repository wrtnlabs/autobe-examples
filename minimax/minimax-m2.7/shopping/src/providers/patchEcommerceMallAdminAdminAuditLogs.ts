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
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.ecommerce_mall_admin_id && {
      ecommerce_mall_admin_id: props.body.ecommerce_mall_admin_id,
    }),
    ...(props.body.action && { action: props.body.action }),
    ...(props.body.resource_type && {
      resource_type: props.body.resource_type,
    }),
    ...(props.body.resource_id && { resource_id: props.body.resource_id }),
    ...(props.body.ip_address && { ip_address: props.body.ip_address }),
    ...(props.body.created_at_from || props.body.created_at_to
      ? {
          created_at: {
            ...(props.body.created_at_from && {
              gte: new Date(props.body.created_at_from),
            }),
            ...(props.body.created_at_to && {
              lte: new Date(props.body.created_at_to),
            }),
          },
        }
      : {}),
  } satisfies Prisma.ecommerce_mall_admin_audit_logsWhereInput;
  const data = await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceMallAdminAuditLogAtSummaryTransformer.select(),
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
      data,
      EcommerceMallAdminAuditLogAtSummaryTransformer.transform,
    ),
  };
}
