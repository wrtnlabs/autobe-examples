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
  const createdAtConditions: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.createdAtMin !== undefined) {
    createdAtConditions.gte = new Date(props.body.createdAtMin);
  }
  if (props.body.createdAtMax !== undefined) {
    createdAtConditions.lte = new Date(props.body.createdAtMax);
  }
  const where = {
    ...(props.body.actionType !== undefined && {
      action_type: props.body.actionType,
    }),
    ...(props.body.targetType !== undefined && {
      target_type: props.body.targetType,
    }),
    ...(props.body.targetId !== undefined && {
      target_id: props.body.targetId,
    }),
    ...(props.body.superAdminId !== undefined && {
      super_admin_id: props.body.superAdminId,
    }),
    ...(Object.keys(createdAtConditions).length > 0 && {
      created_at: createdAtConditions,
    }),
    ...(props.body.ipAddress !== undefined && {
      ip_address: { contains: props.body.ipAddress },
    }),
  } satisfies Prisma.ecommerce_mall_super_admin_audit_logsWhereInput;
  const orderBy = (() => {
    if (props.body.sort !== undefined && props.body.sort.length > 0) {
      const sortParts = props.body.sort[0].split(":");
      if (sortParts.length === 2) {
        const field = sortParts[0];
        const direction = sortParts[1] as "asc" | "desc";
        const prismaFieldMap: Record<string, string> = {
          actionType: "action_type",
          targetType: "target_type",
          createdAt: "created_at",
        };
        const prismaField = prismaFieldMap[field];
        if (prismaField !== undefined) {
          return {
            [prismaField]: direction,
          } as Prisma.ecommerce_mall_super_admin_audit_logsOrderByWithRelationInput;
        }
      }
    }
    return {
      created_at: "desc" as const,
    } as Prisma.ecommerce_mall_super_admin_audit_logsOrderByWithRelationInput;
  })();
  const data =
    await MyGlobal.prisma.ecommerce_mall_super_admin_audit_logs.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...EcommerceMallSuperAdminAuditLogAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_super_admin_audit_logs.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallSuperAdminAuditLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
