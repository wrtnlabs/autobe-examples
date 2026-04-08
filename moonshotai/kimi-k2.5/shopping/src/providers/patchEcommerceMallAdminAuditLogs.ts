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
  // Fetch admin grade to determine access level
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
    where: { id: props.admin.id },
    select: { grade: true },
  });
  const isSuperAdmin = admin.grade === "super_admin";
  // Build date range condition
  const dateRangeCondition: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.dateFrom !== null) {
    dateRangeCondition.gte = new Date(props.body.dateFrom);
  }
  if (props.body.dateTo !== null) {
    dateRangeCondition.lte = new Date(props.body.dateTo);
  }
  // Build where conditions for admin audit logs
  const adminAuditWhere: Prisma.ecommerce_mall_admin_audit_logsWhereInput = {
    ...(props.body.adminId !== null && {
      ecommerce_mall_admin_id: props.body.adminId,
    }),
    ...(props.body.actionTypes !== null &&
      props.body.actionTypes.length > 0 && {
        action: {
          in: props.body.actionTypes,
        },
      }),
    ...(props.body.resourceTypes !== null &&
      props.body.resourceTypes.length > 0 && {
        resource_type: {
          in: props.body.resourceTypes,
        },
      }),
    ...(props.body.resourceId !== null && {
      resource_id: props.body.resourceId,
    }),
    ...(props.body.ipAddress !== null && {
      ip: props.body.ipAddress,
    }),
    ...(Object.keys(dateRangeCondition).length > 0 && {
      created_at: dateRangeCondition,
    }),
  };
  // Build cursor condition for pagination
  const cursorCondition: Prisma.ecommerce_mall_admin_audit_logsWhereInput =
    props.body.createdAt !== null && props.body.id !== null
      ? {
          OR: [
            {
              created_at: {
                lt: new Date(props.body.createdAt),
              },
            },
            {
              created_at: new Date(props.body.createdAt),
              id: {
                lt: props.body.id,
              },
            },
          ],
        }
      : {};
  // Query admin audit logs
  const adminLogs =
    await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.findMany({
      where: {
        ...adminAuditWhere,
        ...cursorCondition,
      },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: limit,
      ...EcommerceMallAdminAuditLogAtSummaryTransformer.select(),
    });
  const totalCount =
    await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.count({
      where: adminAuditWhere,
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
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    } satisfies IPage.IPagination,
  };
}
