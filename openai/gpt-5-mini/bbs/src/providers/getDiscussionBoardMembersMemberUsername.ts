import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function getDiscussionBoardMembersMemberUsername(props: {
  memberUsername: string;
}): Promise<IDiscussionBoardMember.ISummary> {
  const { memberUsername } = props;

  const member = await MyGlobal.prisma.discussion_board_member.findFirst({
    where: {
      username: memberUsername,
      deleted_at: null,
    },
    select: {
      id: true,
      username: true,
      display_name: true,
      created_at: true,
    },
  });

  if (!member) throw new HttpException("Not Found", 404);

  const result = {
    id: member.id as string & tags.Format<"uuid">,
    username: member.username,
    display_name: member.display_name ?? null,
    created_at: toISOStringSafe(member.created_at),
  } satisfies IDiscussionBoardMember.ISummary;

  return result;
}
