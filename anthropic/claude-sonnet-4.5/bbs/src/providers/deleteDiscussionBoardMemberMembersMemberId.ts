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

export async function deleteDiscussionBoardMemberMembersMemberId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMember> {
  // CRITICAL SECURITY: Verify ownership - members can only delete their own account
  if (props.member.id !== props.memberId) {
    throw new HttpException(
      "Forbidden: You can only delete your own account",
      403,
    );
  }

  // Check if member exists
  const existingMember =
    await MyGlobal.prisma.discussion_board_members.findUnique({
      where: { id: props.memberId },
    });

  if (!existingMember) {
    throw new HttpException("Member account not found", 404);
  }

  // Check if already deleted
  if (existingMember.deleted_at !== null) {
    throw new HttpException("Account is already deleted", 400);
  }

  // Perform soft deletion by setting deleted_at timestamp
  const deletedMember = await MyGlobal.prisma.discussion_board_members.update({
    where: { id: props.memberId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Convert to API response format
  return {
    id: deletedMember.id,
    email: deletedMember.email,
    username: deletedMember.username,
    display_name: deletedMember.display_name ?? undefined,
    bio: deletedMember.bio ?? undefined,
    avatar_url: deletedMember.avatar_url ?? undefined,
    email_verified: deletedMember.email_verified,
    email_verified_at: deletedMember.email_verified_at
      ? toISOStringSafe(deletedMember.email_verified_at)
      : undefined,
    is_suspended: deletedMember.is_suspended,
    suspension_reason: deletedMember.suspension_reason ?? undefined,
    suspended_until: deletedMember.suspended_until
      ? toISOStringSafe(deletedMember.suspended_until)
      : undefined,
    last_login_at: deletedMember.last_login_at
      ? toISOStringSafe(deletedMember.last_login_at)
      : undefined,
    created_at: toISOStringSafe(deletedMember.created_at),
    updated_at: toISOStringSafe(deletedMember.updated_at),
    deleted_at: deletedMember.deleted_at
      ? toISOStringSafe(deletedMember.deleted_at)
      : undefined,
  };
}
