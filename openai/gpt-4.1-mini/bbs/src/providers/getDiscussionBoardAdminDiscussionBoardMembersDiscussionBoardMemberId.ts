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
  const { discussionBoardMemberId } = props;

  const member =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: discussionBoardMemberId },
      select: {
        id: true,
        email: true,
        display_name: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (member.deleted_at !== null) {
    throw new HttpException("Discussion board member not found", 404);
  }

  return {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    password_hash: member.password_hash,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
  };
}
