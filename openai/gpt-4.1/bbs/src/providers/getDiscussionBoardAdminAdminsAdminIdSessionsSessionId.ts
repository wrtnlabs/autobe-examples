import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminAdminsAdminIdSessionsSessionId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdminSession> {
  const { admin, adminId, sessionId } = props;
  // Authorize only admin owner (no super-admin role defined in system)
  if (admin.id !== adminId) {
    throw new HttpException(
      "Forbidden: You may only access your own admin session records.",
      403,
    );
  }
  const session =
    await MyGlobal.prisma.discussion_board_admin_sessions.findFirst({
      where: {
        id: sessionId,
        discussion_board_admin_id: adminId,
      },
    });
  if (!session) {
    throw new HttpException("Session not found for this admin.", 404);
  }
  return {
    id: session.id,
    discussion_board_admin_id: session.discussion_board_admin_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };
}
