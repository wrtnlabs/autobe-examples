import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminAdminsAdminIdSessionsSessionId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, adminId, sessionId } = props;

  // Authorization check: Ensure the authenticated admin matches the adminId parameter
  if (admin.id !== adminId) {
    throw new HttpException(
      "Unauthorized: You can only manage your own sessions",
      403,
    );
  }

  // Fetch the session and verify it exists
  const session =
    await MyGlobal.prisma.shopping_mall_sessions.findUniqueOrThrow({
      where: { id: sessionId },
    });

  // Verify ownership: Ensure the session belongs to the authenticated admin
  if (session.admin_id !== admin.id) {
    throw new HttpException(
      "Unauthorized: You can only revoke your own sessions",
      403,
    );
  }

  // Verify this is an admin session
  if (session.user_type !== "admin") {
    throw new HttpException(
      "Invalid session type: Expected admin session",
      400,
    );
  }

  // Check if session is already revoked
  if (session.is_revoked) {
    throw new HttpException("Session is already revoked", 400);
  }

  // Revoke the session by updating is_revoked and revoked_at
  await MyGlobal.prisma.shopping_mall_sessions.update({
    where: { id: sessionId },
    data: {
      is_revoked: true,
      revoked_at: toISOStringSafe(new Date()),
    },
  });
}
