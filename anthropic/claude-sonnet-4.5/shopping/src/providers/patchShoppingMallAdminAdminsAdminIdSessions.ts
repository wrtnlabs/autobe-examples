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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAdminsAdminIdSessions(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminSession.IRequest;
}): Promise<IPageIShoppingMallAdminSession> {
  const { admin, adminId, body } = props;

  // Authorization: admin can view own sessions or super_admin can view any
  if (admin.id !== adminId) {
    const requestingAdmin =
      await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
        where: { id: admin.id },
        select: { role_level: true },
      });

    if (requestingAdmin.role_level !== "super_admin") {
      throw new HttpException(
        "Unauthorized: You can only view your own sessions unless you are a super admin",
        403,
      );
    }
  }

  // Verify target admin exists
  await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
    where: { id: adminId },
  });

  const now = toISOStringSafe(new Date());
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where clause with only verified schema fields
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sessions.findMany({
      where: {
        admin_id: adminId,
        user_type: "admin",
        is_revoked: false,
        refresh_token_expires_at: { gte: now },
        ...(body.device_type !== undefined &&
          body.device_type !== null && {
            device_type: body.device_type,
          }),
        ...((body.start_date !== undefined && body.start_date !== null) ||
        (body.end_date !== undefined && body.end_date !== null)
          ? {
              created_at: {
                ...(body.start_date !== undefined &&
                  body.start_date !== null && {
                    gte: body.start_date,
                  }),
                ...(body.end_date !== undefined &&
                  body.end_date !== null && {
                    lte: body.end_date,
                  }),
              },
            }
          : {}),
      },
      orderBy: { last_activity_at: "desc" },
      skip: skip,
      take: limit,
      select: {
        id: true,
        device_type: true,
        device_name: true,
        browser_name: true,
        operating_system: true,
        approximate_location: true,
        ip_address: true,
        created_at: true,
        last_activity_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_sessions.count({
      where: {
        admin_id: adminId,
        user_type: "admin",
        is_revoked: false,
        refresh_token_expires_at: { gte: now },
        ...(body.device_type !== undefined &&
          body.device_type !== null && {
            device_type: body.device_type,
          }),
        ...((body.start_date !== undefined && body.start_date !== null) ||
        (body.end_date !== undefined && body.end_date !== null)
          ? {
              created_at: {
                ...(body.start_date !== undefined &&
                  body.start_date !== null && {
                    gte: body.start_date,
                  }),
                ...(body.end_date !== undefined &&
                  body.end_date !== null && {
                    lte: body.end_date,
                  }),
              },
            }
          : {}),
      },
    }),
  ]);

  const data: IShoppingMallAdminSession[] = sessions.map((session) => ({
    id: session.id,
    device_type: session.device_type === null ? undefined : session.device_type,
    device_name: session.device_name === null ? undefined : session.device_name,
    browser_name:
      session.browser_name === null ? undefined : session.browser_name,
    operating_system:
      session.operating_system === null ? undefined : session.operating_system,
    approximate_location:
      session.approximate_location === null
        ? undefined
        : session.approximate_location,
    ip_address: session.ip_address,
    created_at: toISOStringSafe(session.created_at),
    last_activity_at: toISOStringSafe(session.last_activity_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}
