import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdminSession";
import { IPageIShoppingAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingAdminSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminAdminsAdminIdSessions(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IShoppingAdminSession.IRequest;
}): Promise<IPageIShoppingAdminSession.ISummary> {
  const { admin, adminId, body } = props;

  // Validate admin exists and is not deleted
  const adminRow = await MyGlobal.prisma.shopping_admins.findFirst({
    where: {
      id: adminId,
      deleted_at: null,
    },
  });
  if (!adminRow) {
    throw new HttpException("Target admin not found", 404);
  }

  // Build query filters
  const createdAtFilter =
    body.login_time_from !== undefined &&
    body.login_time_from !== null &&
    body.login_time_to !== undefined &&
    body.login_time_to !== null
      ? { gte: body.login_time_from, lte: body.login_time_to }
      : body.login_time_from !== undefined && body.login_time_from !== null
        ? { gte: body.login_time_from }
        : body.login_time_to !== undefined && body.login_time_to !== null
          ? { lte: body.login_time_to }
          : undefined;

  const where = {
    shopping_admin_id: adminId,
    ...(body.status === "active" && { expired_at: null }),
    ...(body.status === "expired" && { NOT: { expired_at: null } }),
    ...(body.ip !== undefined &&
      body.ip !== null && {
        ip: { contains: body.ip },
      }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
  };

  // Pagination
  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;

  // Sort logic
  let orderBy: { [k: string]: "asc" | "desc" } = {};
  if (body.order_by === "expired_at") {
    orderBy["expired_at"] = body.order_direction || "desc";
  } else {
    orderBy["created_at"] = body.order_direction || "desc";
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_admin_sessions.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_admin_sessions.count({ where }),
  ]);

  await MyGlobal.prisma.shopping_audit_logs.create({
    data: {
      id: v4(),
      admin_id: admin.id,
      category: "security",
      event_type: "ADMIN_SESSION_QUERY",
      ip: undefined,
      description: `Queried admin sessions for adminId ${adminId}`,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  const data = rows.map((row) => ({
    id: row.id,
    shopping_admin_id: row.shopping_admin_id,
    ip: row.ip,
    href: row.href,
    referrer: row.referrer,
    created_at: toISOStringSafe(row.created_at),
    expired_at: row.expired_at ? toISOStringSafe(row.expired_at) : undefined,
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
