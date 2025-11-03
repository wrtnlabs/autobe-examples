import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorModeratorsModeratorUsername(props: {
  moderator: ModeratorPayload;
  moderatorUsername: string;
}): Promise<IDiscussionBoardModerator> {
  const { moderator, moderatorUsername } = props;

  // Find the target moderator by username
  const targetModerator =
    await MyGlobal.prisma.discussion_board_moderators.findFirst({
      where: {
        username: moderatorUsername,
      },
    });

  if (!targetModerator) {
    throw new HttpException("Moderator not found", 404);
  }

  // Prepare ISO string timestamp for soft delete
  const now = toISOStringSafe(new Date());

  // If already soft-deleted, return current state (idempotent behavior)
  if (targetModerator.deleted_at !== null) {
    return {
      id: targetModerator.id,
      username: targetModerator.username,
      email: targetModerator.email,
      password_hash: targetModerator.password_hash,
      display_name: targetModerator.display_name ?? undefined,
      bio: targetModerator.bio ?? undefined,
      location: targetModerator.location ?? undefined,
      website_url: targetModerator.website_url ?? undefined,
      profile_picture_url: targetModerator.profile_picture_url ?? undefined,
      email_verified: targetModerator.email_verified,
      status: targetModerator.status,
      moderation_permissions: targetModerator.moderation_permissions,
      profile_visibility: targetModerator.profile_visibility,
      activity_visibility: targetModerator.activity_visibility,
      last_login_at: targetModerator.last_login_at
        ? toISOStringSafe(targetModerator.last_login_at)
        : undefined,
      created_at: toISOStringSafe(targetModerator.created_at),
      updated_at: toISOStringSafe(targetModerator.updated_at),
      deleted_at: toISOStringSafe(targetModerator.deleted_at),
    };
  }

  // Perform soft delete update
  await MyGlobal.prisma.discussion_board_moderators.update({
    where: {
      id: targetModerator.id,
    },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  // Return complete moderator object with all date fields converted
  return {
    id: targetModerator.id,
    username: targetModerator.username,
    email: targetModerator.email,
    password_hash: targetModerator.password_hash,
    display_name: targetModerator.display_name ?? undefined,
    bio: targetModerator.bio ?? undefined,
    location: targetModerator.location ?? undefined,
    website_url: targetModerator.website_url ?? undefined,
    profile_picture_url: targetModerator.profile_picture_url ?? undefined,
    email_verified: targetModerator.email_verified,
    status: targetModerator.status,
    moderation_permissions: targetModerator.moderation_permissions,
    profile_visibility: targetModerator.profile_visibility,
    activity_visibility: targetModerator.activity_visibility,
    last_login_at: targetModerator.last_login_at
      ? toISOStringSafe(targetModerator.last_login_at)
      : undefined,
    created_at: toISOStringSafe(targetModerator.created_at),
    updated_at: now,
    deleted_at: now,
  };
}
