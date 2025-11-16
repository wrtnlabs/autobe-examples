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

export async function getDiscussionBoardModeratorMembersMemberId(props: {
  moderator: ModeratorPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMember> {
  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: props.memberId },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  return {
    id: member.id,
    username: member.username,
    email: member.email,
    status: member.status,
    email_verified: member.email_verified,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
  };
}
