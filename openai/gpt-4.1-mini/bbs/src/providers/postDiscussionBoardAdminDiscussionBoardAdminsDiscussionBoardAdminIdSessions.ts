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

export async function postDiscussionBoardAdminDiscussionBoardAdminsDiscussionBoardAdminIdSessions(props: {
  admin: AdminPayload;
  discussionBoardAdminId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdminSession.ICreate;
}): Promise<IDiscussionBoardAdminSession> {
  // Get current ISO datetime string for created_at
  const nowStr = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.discussion_board_admin_sessions.create({
    data: {
      id: v4(),
      discussion_board_admin_id: props.discussionBoardAdminId,
      ip: props.body.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: nowStr,
      expired_at: props.body.expired_at ?? null,
    },
  });

  return {
    id: created.id,
    discussion_board_admin_id: created.discussion_board_admin_id,
    ip: created.ip,
    href: created.href,
    referrer: created.referrer,
    created_at: toISOStringSafe(created.created_at),
    expired_at:
      created.expired_at !== null ? toISOStringSafe(created.expired_at) : null,
  } as IDiscussionBoardAdminSession;
}
