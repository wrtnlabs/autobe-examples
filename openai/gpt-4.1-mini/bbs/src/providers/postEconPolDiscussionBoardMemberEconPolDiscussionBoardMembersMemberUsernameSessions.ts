import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMemberSession";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postEconPolDiscussionBoardMemberEconPolDiscussionBoardMembersMemberUsernameSessions(props: {
  member: MemberPayload;
  memberUsername: string;
  body: IEconPolDiscussionBoardMemberSession.ICreate;
}): Promise<void> {
  if ((props.member as any).username !== props.memberUsername) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.econ_pol_discussion_board_member_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      member: {
        connect: {
          id: props.member.id satisfies string as string,
        },
      },
      ip: (props.body.ip ?? "") satisfies string as string,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      expired_at: null,
    },
  });
}
