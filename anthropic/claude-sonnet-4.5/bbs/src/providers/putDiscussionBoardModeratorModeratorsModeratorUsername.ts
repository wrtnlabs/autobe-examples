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

export async function putDiscussionBoardModeratorModeratorsModeratorUsername(props: {
  moderator: ModeratorPayload;
  moderatorUsername: string;
  body: IDiscussionBoardModerator.IUpdate;
}): Promise<IDiscussionBoardModerator> {
  const { moderator, moderatorUsername, body } = props;

  const targetModerator =
    await MyGlobal.prisma.discussion_board_moderators.findFirst({
      where: {
        username: moderatorUsername,
        deleted_at: null,
      },
    });

  if (!targetModerator) {
    throw new HttpException("Moderator not found", 404);
  }

  if (moderator.id !== targetModerator.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own profile",
      403,
    );
  }

  const updated = await MyGlobal.prisma.discussion_board_moderators.update({
    where: { id: targetModerator.id },
    data: {
      display_name:
        body.display_name === undefined ? undefined : body.display_name,
      bio: body.bio === undefined ? undefined : body.bio,
      location: body.location === undefined ? undefined : body.location,
      website_url:
        body.website_url === undefined ? undefined : body.website_url,
      profile_picture_url:
        body.profile_picture_url === undefined
          ? undefined
          : body.profile_picture_url,
      email: body.email ?? undefined,
      moderation_permissions: body.moderation_permissions ?? undefined,
      profile_visibility: body.profile_visibility ?? undefined,
      activity_visibility: body.activity_visibility ?? undefined,
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id satisfies string as string & tags.Format<"uuid">,
    username: updated.username,
    email: updated.email satisfies string as string & tags.Format<"email">,
    password_hash: updated.password_hash,
    display_name: updated.display_name ?? undefined,
    bio: updated.bio ?? undefined,
    location: updated.location ?? undefined,
    website_url: updated.website_url
      ? (updated.website_url satisfies string as string & tags.Format<"uri">)
      : undefined,
    profile_picture_url: updated.profile_picture_url
      ? (updated.profile_picture_url satisfies string as string &
          tags.Format<"uri">)
      : undefined,
    email_verified: updated.email_verified,
    status: updated.status,
    moderation_permissions: updated.moderation_permissions,
    profile_visibility: updated.profile_visibility,
    activity_visibility: updated.activity_visibility,
    last_login_at: updated.last_login_at
      ? toISOStringSafe(updated.last_login_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
