import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuditLog";
import { IPageIShoppingAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IShoppingAuditLog.IRequest;
}): Promise<IPageIShoppingAuditLog.ISummary> {
  const { body } = props;
  const page = Number(body.page);
  const limit = Number(body.limit);
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {
    ...(body.category !== undefined && { category: body.category }),
    ...(body.event_type !== undefined && { event_type: body.event_type }),
    ...(body.admin_id !== undefined && { admin_id: body.admin_id }),
    ...(body.seller_id !== undefined && { seller_id: body.seller_id }),
    ...(body.customer_id !== undefined && { customer_id: body.customer_id }),
    ...(body.date_from !== undefined || body.date_to !== undefined
      ? {
          created_at: {
            ...(body.date_from !== undefined && { gte: body.date_from }),
            ...(body.date_to !== undefined && { lte: body.date_to }),
          },
        }
      : {}),
    ...(body.description_q !== undefined && {
      description: { contains: body.description_q },
    }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_audit_logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        admin_id: true,
        seller_id: true,
        customer_id: true,
        category: true,
        event_type: true,
        ip: true,
        description: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_audit_logs.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    admin_id: row.admin_id ?? undefined,
    seller_id: row.seller_id ?? undefined,
    customer_id: row.customer_id ?? undefined,
    category: row.category,
    event_type: row.event_type,
    ip: row.ip ?? undefined,
    description: row.description ?? undefined,
    created_at: toISOStringSafe(row.created_at),
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
