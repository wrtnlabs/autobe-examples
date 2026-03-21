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
  const whereConditions: Prisma.ecommerce_mall_super_admin_audit_logsWhereInput[] =
    [];
  if (props.body.action !== undefined) {
    whereConditions.push({ action: props.body.action });
  }
  if (props.body.targetType !== undefined) {
    whereConditions.push({ target_type: props.body.targetType });
  }
  if (props.body.targetId !== undefined) {
    whereConditions.push({ target_id: props.body.targetId });
  }
  if (props.body.superAdminId !== undefined) {
    whereConditions.push({
      ecommerce_mall_super_admin_id: props.body.superAdminId,
    });
  }
  if (
    props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
  ) {
    const dateFilter: {
      gte?: Date;
      lte?: Date;
    } = {};
    if (props.body.createdAtFrom !== undefined) {
      dateFilter.gte = new Date(props.body.createdAtFrom);
    }
    if (props.body.createdAtTo !== undefined) {
      dateFilter.lte = new Date(props.body.createdAtTo);
    }
    whereConditions.push({ created_at: dateFilter });
  }
  const whereInput =
    whereConditions.length > 0 ? { AND: whereConditions } : undefined;
  const data =
    await MyGlobal.prisma.ecommerce_mall_super_admin_audit_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
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
