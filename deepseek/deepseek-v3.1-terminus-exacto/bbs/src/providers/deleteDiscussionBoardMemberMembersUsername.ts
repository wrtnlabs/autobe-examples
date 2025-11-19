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

export async function deleteDiscussionBoardMemberMembersUsername(props: {
  member: MemberPayload;
  username: string;
}): Promise<IDiscussionBoardMember> {
  // Find the target member by username
  const targetMember = await MyGlobal.prisma.discussion_board_members.findFirst(
    {
      where: {
        username: props.username,
        deleted_at: null,
      },
    },
  );

  if (!targetMember) {
    throw new HttpException("Member account not found or already deleted", 404);
  }

  // Verify authorization - only the member themselves can delete their account
  if (targetMember.id !== props.member.id) {
    throw new HttpException("You can only delete your own account", 403);
  }

  // Perform soft deletion by setting deleted_at timestamp
  const updated = await MyGlobal.prisma.discussion_board_members.update({
    where: {
      id: targetMember.id,
    },
    data: {
      deleted_at: new Date(),
    },
  });

  // Convert to API response format with proper null/undefined handling
  return {
    id: updated.id,
    email: updated.email,
    username: updated.username,
    display_name: updated.display_name ?? undefined,
    bio: updated.bio ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
