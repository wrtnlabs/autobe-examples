import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminDiscussionBoardAdminsDiscussionBoardAdminIdSessionsSessionId(props: {
  admin: AdminPayload;
  discussionBoardAdminId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  if (props.admin.id !== props.discussionBoardAdminId) {
    throw new HttpException("Forbidden", 403);
  }

  const session =
    await MyGlobal.prisma.discussion_board_admin_sessions.findUnique({
      where: {
        id: props.sessionId,
      },
    });

  if (
    !session ||
    session.discussion_board_admin_id !== props.discussionBoardAdminId
  ) {
    throw new HttpException("Session not found", 404);
  }

  await MyGlobal.prisma.discussion_board_admin_sessions.delete({
    where: {
      id: props.sessionId,
    },
  });
}
