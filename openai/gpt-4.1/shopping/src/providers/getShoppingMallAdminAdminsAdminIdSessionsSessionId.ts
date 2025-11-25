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
  // Enforce admin identity matches requested adminId
  if (props.admin.id !== props.adminId) {
    throw new HttpException(
      "Forbidden: Cannot access sessions for other admins.",
      403,
    );
  }

  // Fetch session with admin linkage
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.findFirst({
    where: {
      id: props.sessionId,
      shopping_mall_admin_id: props.adminId,
    },
  });
  if (!session) {
    throw new HttpException("Session not found.", 404);
  }

  // Fetch minimal admin summary info
  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { id: props.adminId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
  if (!admin) {
    // Should not happen for authorized admin, but defend for consistency
    throw new HttpException("Admin not found.", 404);
  }

  return {
    id: session.id,
    shopping_mall_admin_id: session.shopping_mall_admin_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at !== null && session.expired_at !== undefined
        ? toISOStringSafe(session.expired_at)
        : session.expired_at,
    admin,
  };
}
