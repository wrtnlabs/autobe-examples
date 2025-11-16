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
  // 1. Authorization: Must only allow access to own adminId
  if (props.admin.id !== props.adminId) {
    throw new HttpException(
      "Forbidden: Cannot access sessions of another admin.",
      403,
    );
  }

  // 2. Query the session with both admin and session IDs
  const record =
    await MyGlobal.prisma.discussion_board_admin_sessions.findUnique({
      where: {
        id: props.sessionId,
        discussion_board_admin_id: props.adminId,
      },
    });

  if (!record) {
    throw new HttpException("Admin session not found.", 404);
  }

  return {
    id: record.id,
    discussion_board_admin_id: record.discussion_board_admin_id,
    ip: record.ip,
    href: record.href,
    referrer: record.referrer,
    created_at: toISOStringSafe(record.created_at),
    expired_at: record.expired_at
      ? toISOStringSafe(record.expired_at)
      : undefined,
  };
}
