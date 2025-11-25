import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function postAuthMemberEmailVerify(props: {
  body: IDiscussionBoardMember.IVerifyEmail;
}): Promise<IDiscussionBoardMember> {
  const verification =
    await MyGlobal.prisma.discussion_board_email_verifications.findUnique({
      where: { token: props.body.token },
    });

  if (!verification) {
    throw new HttpException("Invalid or expired verification token", 404);
  }

  if (verification.verified_at !== null) {
    throw new HttpException(
      "This verification token has already been used",
      400,
    );
  }

  const now = new Date();
  if (now > verification.expires_at) {
    throw new HttpException("Verification token has expired", 400);
  }

  const [updatedMember] = await Promise.all([
    MyGlobal.prisma.discussion_board_members.update({
      where: { id: verification.discussion_board_member_id },
      data: {
        email_verified: true,
        email_verified_at: now,
      },
    }),
    MyGlobal.prisma.discussion_board_email_verifications.update({
      where: { id: verification.id },
      data: {
        verified_at: now,
      },
    }),
  ]);

  return {
    id: updatedMember.id,
    email: updatedMember.email,
    username: updatedMember.username,
    display_name:
      updatedMember.display_name === null
        ? undefined
        : updatedMember.display_name,
    bio: updatedMember.bio === null ? undefined : updatedMember.bio,
    avatar_url:
      updatedMember.avatar_url === null ? undefined : updatedMember.avatar_url,
    email_verified: updatedMember.email_verified,
    email_verified_at: updatedMember.email_verified_at
      ? toISOStringSafe(updatedMember.email_verified_at)
      : undefined,
    is_suspended: updatedMember.is_suspended,
    suspension_reason:
      updatedMember.suspension_reason === null
        ? undefined
        : updatedMember.suspension_reason,
    suspended_until: updatedMember.suspended_until
      ? toISOStringSafe(updatedMember.suspended_until)
      : undefined,
    last_login_at: updatedMember.last_login_at
      ? toISOStringSafe(updatedMember.last_login_at)
      : undefined,
    created_at: toISOStringSafe(updatedMember.created_at),
    updated_at: toISOStringSafe(updatedMember.updated_at),
    deleted_at: updatedMember.deleted_at
      ? toISOStringSafe(updatedMember.deleted_at)
      : undefined,
  };
}
