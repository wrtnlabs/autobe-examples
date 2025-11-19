import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorMembersUsername(props: {
  moderator: ModeratorPayload;
  username: string;
}): Promise<IDiscussionBoardMember.ISummary> {
  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: {
      username: props.username,
      deleted_at: null,
    },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  return {
    id: member.id as string & tags.Format<"uuid">,
    type: "member",
    name: member.username,
  };
}
