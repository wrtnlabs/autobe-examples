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

export async function putDiscussionBoardMemberMembersMemberUsername(props: {
  member: MemberPayload;
  memberUsername: string;
  body: IDiscussionBoardMember.IUpdate;
}): Promise<IDiscussionBoardMember> {
  const { member, memberUsername, body } = props;

  // Fetch authenticated member to verify ownership
  const authenticatedMember =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: member.id },
    });

  // MANDATORY AUTHORIZATION: Verify ownership - member can only update their own profile
  if (authenticatedMember.username !== memberUsername) {
    throw new HttpException(
      "Unauthorized: You can only update your own profile",
      403,
    );
  }

  // Verify member is not soft-deleted
  if (authenticatedMember.deleted_at !== null) {
    throw new HttpException("Member account has been deleted", 404);
  }

  // Verify member account is active
  if (authenticatedMember.status !== "active") {
    throw new HttpException(
      "Member account is not active and cannot be updated",
      403,
    );
  }

  // Verify email is verified
  if (!authenticatedMember.email_verified) {
    throw new HttpException(
      "Email must be verified before updating profile",
      403,
    );
  }

  // Prepare update timestamp
  const now = toISOStringSafe(new Date());

  // Update member profile with provided fields
  const updated = await MyGlobal.prisma.discussion_board_members.update({
    where: { username: memberUsername },
    data: {
      display_name: body.display_name ?? undefined,
      bio: body.bio ?? undefined,
      location: body.location ?? undefined,
      website_url: body.website_url ?? undefined,
      profile_picture_url: body.profile_picture_url ?? undefined,
      profile_visibility: body.profile_visibility ?? undefined,
      activity_visibility: body.activity_visibility ?? undefined,
      updated_at: now,
    },
  });

  // Return complete member object with converted date fields
  return {
    id: updated.id as string & tags.Format<"uuid">,
    username: updated.username,
    email: updated.email as string & tags.Format<"email">,
    password_hash: updated.password_hash,
    display_name: updated.display_name ?? undefined,
    bio: updated.bio ?? undefined,
    location: updated.location ?? undefined,
    website_url: updated.website_url
      ? (updated.website_url as string & tags.Format<"uri">)
      : undefined,
    profile_picture_url: updated.profile_picture_url
      ? (updated.profile_picture_url as string & tags.Format<"uri">)
      : undefined,
    email_verified: updated.email_verified,
    status: updated.status,
    profile_visibility: updated.profile_visibility,
    activity_visibility: updated.activity_visibility,
    last_login_at: updated.last_login_at
      ? toISOStringSafe(updated.last_login_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
