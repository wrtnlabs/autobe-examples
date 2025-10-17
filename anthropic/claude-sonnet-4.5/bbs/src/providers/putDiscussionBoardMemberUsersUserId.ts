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

export async function putDiscussionBoardMemberUsersUserId(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardMember.IUpdate;
}): Promise<IDiscussionBoardMember> {
  const { member, userId, body } = props;

  // MANDATORY AUTHORIZATION: Members can only update their own profiles
  if (member.id !== userId) {
    throw new HttpException(
      "Forbidden: You can only update your own profile",
      403,
    );
  }

  // Verify member exists and is active
  const existingMember =
    await MyGlobal.prisma.discussion_board_members.findFirst({
      where: {
        id: userId,
        deleted_at: null,
      },
    });

  if (!existingMember) {
    throw new HttpException("Member not found", 404);
  }

  // Apply privacy hierarchy rule: if profile_visibility is 'private',
  // activity_visibility must also be 'private'
  let finalActivityVisibility = body.activity_visibility;
  if (body.profile_visibility === "private") {
    finalActivityVisibility = "private";
  }

  const now = toISOStringSafe(new Date());

  // Update member profile
  const updated = await MyGlobal.prisma.discussion_board_members.update({
    where: { id: userId },
    data: {
      display_name: body.display_name ?? undefined,
      bio: body.bio ?? undefined,
      avatar_url: body.avatar_url ?? undefined,
      location: body.location ?? undefined,
      website: body.website ?? undefined,
      profile_visibility: body.profile_visibility ?? undefined,
      activity_visibility: finalActivityVisibility ?? undefined,
      timezone: body.timezone ?? undefined,
      language: body.language ?? undefined,
      updated_at: now,
      last_activity_at: now,
    },
  });

  // Return updated profile matching IDiscussionBoardMember structure
  return {
    id: updated.id,
    username: updated.username,
    display_name: updated.display_name ?? undefined,
    bio: updated.bio ?? undefined,
    avatar_url: updated.avatar_url ?? undefined,
    location: updated.location ?? undefined,
    website: updated.website ?? undefined,
    email_verified: updated.email_verified,
    account_status: updated.account_status,
    profile_visibility: updated.profile_visibility,
    activity_visibility: updated.activity_visibility,
    created_at: toISOStringSafe(updated.created_at),
    last_activity_at: updated.last_activity_at
      ? toISOStringSafe(updated.last_activity_at)
      : undefined,
  };
}
