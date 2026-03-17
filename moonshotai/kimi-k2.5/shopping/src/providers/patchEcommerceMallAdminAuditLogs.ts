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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdminAuditLog.IRequest;
}): Promise<IPageIEcommerceMallAdminAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_admin_audit_logsWhereInput = {
    ...(props.body.adminId !== undefined &&
      props.body.adminId !== null && {
        ecommerce_mall_admin_id: props.body.adminId,
      }),
    ...(props.body.action !== undefined &&
      props.body.action !== null && {
        action: { contains: props.body.action },
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
        ip: { contains: props.body.ip },
      }),
    ...((props.body.createdAtFrom !== undefined ||
      props.body.createdAtTo !== undefined) && {
      created_at: {
        ...(props.body.createdAtFrom !== undefined &&
          props.body.createdAtFrom !== null && {
            gte: new Date(props.body.createdAtFrom),
          }),
        ...(props.body.createdAtTo !== undefined &&
          props.body.createdAtTo !== null && {
            lte: new Date(props.body.createdAtTo),
          }),
      },
    }),
  };
  const orderByInput: Prisma.ecommerce_mall_admin_audit_logsOrderByWithRelationInput =
    props.body.sortBy === "action"
      ? { action: props.body.sortOrder ?? "desc" }
      : props.body.sortBy === "resource_type"
        ? { resource_type: props.body.sortOrder ?? "desc" }
        : { created_at: props.body.sortOrder ?? "desc" };
  const total = await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.count({
    where: whereInput,
  });
  const data = await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          grade: true,
          status: true,
          nickname: true,
          created_at: true,
        },
      },
    },
  });
  const transformed = await ArrayUtil.asyncMap(
    data,
    async (record) =>
      ({
        id: record.id,
        action: record.action,
        resourceType: record.resource_type,
        resourceId: record.resource_id,
        admin: {
          id: record.admin.id,
          email: record.admin.email,
          grade: record.admin.grade,
          status: record.admin.status,
          nickname: record.admin.nickname,
          createdAt: toISOStringSafe(record.admin.created_at),
        } satisfies IEcommerceMallAdmin.ISummary,
        createdAt: toISOStringSafe(record.created_at),
      }) satisfies IEcommerceMallAdminAuditLog.ISummary,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
