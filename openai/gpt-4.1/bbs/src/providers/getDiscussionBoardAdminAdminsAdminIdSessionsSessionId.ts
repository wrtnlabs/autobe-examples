import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminAdminsAdminIdSessionsSessionId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdminSession> {
  // Find session and linked admin in one query
  const session =
    await MyGlobal.prisma.discussion_board_admin_sessions.findUnique({
      where: { id: props.sessionId },
      include: { admin: true },
    });

  // Check session exists, belongs to the correct admin, and admin is not deleted
  if (
    !session ||
    session.admin_id !== props.adminId ||
    session.admin.deleted_at !== null
  ) {
    throw new HttpException("Session not found or inaccessible", 404);
  }

  return {
    id: session.id,
    admin: {
      id: session.admin.id,
      email: session.admin.email,
      created_at: toISOStringSafe(session.admin.created_at),
      updated_at: toISOStringSafe(session.admin.updated_at),
      deleted_at: session.admin.deleted_at
        ? toISOStringSafe(session.admin.deleted_at)
        : undefined,
    },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };
}
