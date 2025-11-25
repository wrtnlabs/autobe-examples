import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminAdminsAdminIdSessionsSessionId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminSession> {
  if (props.admin.id !== props.adminId) {
    throw new HttpException(
      "Forbidden: You can only access your own sessions",
      403,
    );
  }

  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.findUnique(
    {
      where: {
        id: props.sessionId,
      },
    },
  );

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (session.shopping_mall_admin_id !== props.adminId) {
    throw new HttpException(
      "Forbidden: Session does not belong to the specified admin",
      403,
    );
  }

  const admin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: {
      id: session.shopping_mall_admin_id,
    },
  });

  if (!admin) {
    throw new HttpException("Admin not found", 404);
  }

  return {
    id: session.id,
    admin: {
      id: admin.id,
      email: admin.email,
      full_name: admin.full_name,
      phone_number: admin.phone_number,
      admin_level: typia.assert<"super_admin" | "moderator" | "support">(
        admin.admin_level,
      ),
      email_verified: admin.email_verified,
      created_at: toISOStringSafe(admin.created_at),
      updated_at: toISOStringSafe(admin.updated_at),
      deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at === null
        ? undefined
        : toISOStringSafe(session.expired_at),
  };
}
