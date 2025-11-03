import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminAdminsAdminIdSessionsSessionId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Authorization: Only the admin (by ID) can delete their own session
  if (props.admin.id !== props.adminId) {
    throw new HttpException(
      "Forbidden: Cannot delete another admin's session",
      403,
    );
  }

  // 2. Fetch the session by sessionId + adminId
  const session =
    await MyGlobal.prisma.community_platform_admin_sessions.findUnique({
      where: { id: props.sessionId },
    });
  if (session === null) {
    throw new HttpException("Session not found", 404);
  }
  if (session.community_platform_admin_id !== props.adminId) {
    throw new HttpException("Session does not belong to this admin", 403);
  }
  if (session.expired_at !== null) {
    throw new HttpException("Session is already expired", 409);
  }

  // 3. Delete the session (hard delete)
  await MyGlobal.prisma.community_platform_admin_sessions.delete({
    where: { id: props.sessionId },
  });
}
