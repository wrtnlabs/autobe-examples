import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAdminsAdminIdSessions(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminSession.IRequest;
}): Promise<IPageIShoppingMallAdminSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const [sessions, admin, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_admin_sessions.findMany({
      where: {
        shopping_mall_admin_id: props.adminId,
        ...(props.body.status === "active" && { expired_at: null }),
        ...(props.body.status === "expired" && { expired_at: { not: null } }),
        ...(props.body.ip && { ip: { contains: props.body.ip } }),
        ...(props.body.created_after && {
          created_at: { gte: new Date(props.body.created_after) },
        }),
        ...(props.body.created_before && {
          created_at: {
            ...(props.body.created_after && {
              gte: new Date(props.body.created_after),
            }),
            lte: new Date(props.body.created_before),
          },
        }),
        ...(props.body.search && {
          OR: [
            { ip: { contains: props.body.search } },
            { href: { contains: props.body.search } },
            { referrer: { contains: props.body.search } },
          ],
        }),
      },
      skip,
      take: limit,
      orderBy: {
        [props.body.sort_by ?? "created_at"]: props.body.sort_order ?? "desc",
      },
    }),
    MyGlobal.prisma.shopping_mall_admins.findUnique({
      where: { id: props.adminId },
    }),
    MyGlobal.prisma.shopping_mall_admin_sessions.count({
      where: {
        shopping_mall_admin_id: props.adminId,
        ...(props.body.status === "active" && { expired_at: null }),
        ...(props.body.status === "expired" && { expired_at: { not: null } }),
        ...(props.body.ip && { ip: { contains: props.body.ip } }),
        ...(props.body.created_after && {
          created_at: { gte: new Date(props.body.created_after) },
        }),
        ...(props.body.created_before && {
          created_at: {
            ...(props.body.created_after && {
              gte: new Date(props.body.created_after),
            }),
            lte: new Date(props.body.created_before),
          },
        }),
        ...(props.body.search && {
          OR: [
            { ip: { contains: props.body.search } },
            { href: { contains: props.body.search } },
            { referrer: { contains: props.body.search } },
          ],
        }),
      },
    }),
  ]);

  if (!admin) {
    throw new HttpException("Admin not found", 404);
  }

  return {
    data: sessions.map((session) => ({
      id: session.id,
      admin: {
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
        phone_number: admin.phone_number,
        admin_level: admin.admin_level as
          | "super_admin"
          | "moderator"
          | "support",
        email_verified: admin.email_verified,
        created_at: toISOStringSafe(admin.created_at),
        updated_at: toISOStringSafe(admin.updated_at),
        deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
      },
      ip: session.ip,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    },
  };
}
