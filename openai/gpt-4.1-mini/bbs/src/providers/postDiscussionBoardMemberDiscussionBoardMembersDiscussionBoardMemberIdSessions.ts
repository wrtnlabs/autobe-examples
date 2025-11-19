import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberDiscussionBoardMembersDiscussionBoardMemberIdSessions(props: {
  member: MemberPayload;
  discussionBoardMemberId: string & tags.Format<"uuid">;
  body: IDiscussionBoardMemberSession.ICreate;
}): Promise<IDiscussionBoardMemberSession> {
  const created = await MyGlobal.prisma.discussion_board_member_sessions.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_member_id: props.discussionBoardMemberId,
        ip: props.body.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: toISOStringSafe(props.body.created_at),
        expired_at: props.body.expired_at
          ? toISOStringSafe(props.body.expired_at)
          : null,
      },
    },
  );

  return {
    id: created.id,
    discussion_board_member_id: created.discussion_board_member_id,
    ip: created.ip,
    href: created.href,
    referrer: created.referrer,
    created_at: toISOStringSafe(created.created_at),
    expired_at: created.expired_at ? toISOStringSafe(created.expired_at) : null,
  };
}
