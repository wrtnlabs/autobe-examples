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
  const whereInput: Prisma.ecommerce_mall_admin_audit_logsWhereInput = {
    ...(props.body.adminId !== undefined && {
      ecommerce_mall_admin_id: props.body.adminId,
    }),
    ...(props.body.action !== undefined && {
      action: { contains: props.body.action, mode: "insensitive" },
    }),
    ...(props.body.resourceType !== undefined &&
      props.body.resourceType !== null && {
        resource_type: props.body.resourceType,
      }),
    ...(props.body.resourceId !== undefined &&
      props.body.resourceId !== null && {
        resource_id: props.body.resourceId,
      }),
    ...(props.body.ip !== undefined &&
      props.body.ip !== null && {
        ip: props.body.ip,
      }),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined && {
              gte: new Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo !== undefined && {
              lte: new Date(props.body.createdAtTo),
            }),
          },
        }
      : {}),
  };
  const orderByInput: Prisma.ecommerce_mall_admin_audit_logsOrderByWithRelationInput =
    props.body.sortBy === "created_at" || props.body.sortBy === undefined
      ? { created_at: props.body.sortOrder ?? "desc" }
      : props.body.sortBy === "action"
        ? { action: props.body.sortOrder ?? "desc" }
        : { created_at: props.body.sortOrder ?? "desc" };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_admin_audit_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallAdminAuditLogAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_admin_audit_logs.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallAdminAuditLogAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
