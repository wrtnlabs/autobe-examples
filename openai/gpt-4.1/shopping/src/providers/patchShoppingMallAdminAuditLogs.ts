import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuditLog";
import { IPageIShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IShoppingMallAuditLog.IRequest;
}): Promise<IPageIShoppingMallAuditLog> {
  const body = props.body;
  // Pagination
  const page = body.page && body.page >= 1 ? body.page : 1;
  const limit =
    body.limit && body.limit >= 1 && body.limit <= 100 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Sorting
  const allowedSortBy = ["created_at", "risk_level", "change_type"];
  const allowedSortDirection = ["asc", "desc"];
  const sort_by = allowedSortBy.includes(body.sort_by ?? "")
    ? body.sort_by!
    : "created_at";
  const sort_direction = allowedSortDirection.includes(
    body.sort_direction ?? "",
  )
    ? body.sort_direction!
    : "desc";
  const orderBy: Record<string, "asc" | "desc"> = {};
  orderBy[sort_by] = sort_direction;

  // Prisma where clause
  const where: Record<string, unknown> = {
    ...(body.change_type && { change_type: body.change_type }),
    ...(body.risk_level && { risk_level: body.risk_level }),
    ...(body.compliance_tag && { compliance_tag: body.compliance_tag }),
    ...(body.actor_admin_id && { actor_admin_id: body.actor_admin_id }),
    ...(body.actor_seller_id && { actor_seller_id: body.actor_seller_id }),
    ...(body.actor_customer_id && {
      actor_customer_id: body.actor_customer_id,
    }),
    ...(body.start_time && {
      created_at: {
        ...(body.start_time && { gte: body.start_time }),
        ...(body.end_time && { lte: body.end_time }),
      },
    }),
    ...(!body.start_time &&
      body.end_time && {
        created_at: { lte: body.end_time },
      }),
    ...(body.search && {
      OR: [
        { audit_detail: { contains: body.search } },
        { change_type: { contains: body.search } },
        { compliance_tag: { contains: body.search } },
        { risk_level: { contains: body.search } },
      ],
    }),
  };

  // If both start_time and end_time are present, ensure created_at clause merges properly
  if (body.start_time && body.end_time) {
    where.created_at = { gte: body.start_time, lte: body.end_time };
  }

  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_audit_logs.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_audit_logs.count({ where }),
  ]);

  const data = records.map((log) => ({
    id: log.id,
    change_type: log.change_type,
    risk_level: log.risk_level,
    compliance_tag: log.compliance_tag,
    audit_detail: log.audit_detail,
    created_at: toISOStringSafe(log.created_at),
    actor_admin_id: log.actor_admin_id ?? undefined,
    actor_seller_id: log.actor_seller_id ?? undefined,
    actor_customer_id: log.actor_customer_id ?? undefined,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
