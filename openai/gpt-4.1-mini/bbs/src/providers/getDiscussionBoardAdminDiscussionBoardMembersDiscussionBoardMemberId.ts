import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardMember";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminDiscussionBoardMembersDiscussionBoardMemberId(props: {
  admin: AdminPayload;
  discussionBoardMemberId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardDiscussionBoardMember> {
  const member = await MyGlobal.prisma.discussion_board_member.findUnique({
    where: { id: props.discussionBoardMemberId },
    select: {
      id: true,
      email: true,
      nickname: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (member === null) {
    throw new HttpException("Discussion board member not found", 404);
  }

  return {
    id: member.id,
    email: member.email,
    nickname: member.nickname,
    status: typia.assert<"active" | "banned" | "pending">("pending"),
    role: "" satisfies string as string,
    created_at: toISOStringSafe(member.created_at),
    updated_at: member.updated_at
      ? toISOStringSafe(member.updated_at)
      : undefined,
  };
}
