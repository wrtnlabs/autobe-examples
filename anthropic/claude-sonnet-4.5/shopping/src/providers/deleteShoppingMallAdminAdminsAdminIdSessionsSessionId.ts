import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminAdminsAdminIdSessionsSessionId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminSession> {
  if (props.admin.id !== props.adminId) {
    throw new HttpException(
      "Forbidden: You can only terminate your own sessions",
      403,
    );
  }

  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.findFirst({
    where: {
      id: props.sessionId,
      shopping_mall_admin_id: props.adminId,
    },
  });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  const admin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: {
      id: props.adminId,
    },
  });

  if (!admin) {
    throw new HttpException("Admin not found", 404);
  }

  const now = new Date();
  const deletedSession =
    await MyGlobal.prisma.shopping_mall_admin_sessions.update({
      where: {
        id: props.sessionId,
      },
      data: {
        expired_at: now,
      },
    });

  return {
    id: deletedSession.id,
    admin: {
      id: admin.id,
      email: admin.email,
      full_name: admin.full_name,
      phone_number: admin.phone_number,
      admin_level: admin.admin_level as "super_admin" | "moderator" | "support",
      email_verified: admin.email_verified,
      created_at: toISOStringSafe(admin.created_at),
      updated_at: toISOStringSafe(admin.updated_at),
      deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    },
    ip: deletedSession.ip,
    href: deletedSession.href,
    referrer: deletedSession.referrer,
    created_at: toISOStringSafe(deletedSession.created_at),
    expired_at: deletedSession.expired_at
      ? toISOStringSafe(deletedSession.expired_at)
      : null,
  };
}
