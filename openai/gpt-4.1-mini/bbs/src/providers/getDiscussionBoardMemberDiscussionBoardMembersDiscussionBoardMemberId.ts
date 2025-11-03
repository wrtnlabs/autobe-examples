import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getDiscussionBoardMemberDiscussionBoardMembersDiscussionBoardMemberId(props: {
  member: MemberPayload;
  discussionBoardMemberId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMember.ISummary> {
  const { member, discussionBoardMemberId } = props;

  if (member.id !== discussionBoardMemberId) {
    throw new HttpException(
      "Unauthorized: You can only access your own profile",
      403,
    );
  }

  const found = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: discussionBoardMemberId },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!found || found.deleted_at !== null) {
    throw new HttpException("Discussion board member not found", 404);
  }

  return {
    id: found.id,
    email: found.email,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
  };
}
