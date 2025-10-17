import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminAdminsAdminIdSessionsSessionId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminSession> {
  const { admin, adminId, sessionId } = props;

  // Authorization: Verify admin is accessing their own session
  if (admin.id !== adminId) {
    throw new HttpException(
      "Unauthorized: Cannot access other admin's sessions",
      403,
    );
  }

  // Fetch the session with ownership and status validation
  const session = await MyGlobal.prisma.shopping_mall_sessions.findFirst({
    where: {
      id: sessionId,
      admin_id: adminId,
      user_type: "admin",
      is_revoked: false,
      refresh_token_expires_at: {
        gt: new Date(),
      },
    },
  });

  if (!session) {
    throw new HttpException("Session not found or expired", 404);
  }

  // Map to IShoppingMallAdminSession
  return {
    id: session.id as string & tags.Format<"uuid">,
    device_type: session.device_type ?? undefined,
    device_name: session.device_name ?? undefined,
    browser_name: session.browser_name ?? undefined,
    operating_system: session.operating_system ?? undefined,
    approximate_location: session.approximate_location ?? undefined,
    ip_address: session.ip_address,
    created_at: toISOStringSafe(session.created_at),
    last_activity_at: toISOStringSafe(session.last_activity_at),
  };
}
