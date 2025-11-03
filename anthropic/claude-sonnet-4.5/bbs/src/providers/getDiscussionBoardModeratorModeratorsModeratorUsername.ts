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

export async function getDiscussionBoardModeratorModeratorsModeratorUsername(props: {
  moderator: ModeratorPayload;
  moderatorUsername: string;
}): Promise<IDiscussionBoardModerator> {
  const { moderatorUsername } = props;

  const moderator =
    await MyGlobal.prisma.discussion_board_moderators.findUniqueOrThrow({
      where: {
        username: moderatorUsername,
      },
    });

  return {
    id: moderator.id as string & tags.Format<"uuid">,
    username: moderator.username,
    email: moderator.email,
    password_hash: moderator.password_hash,
    display_name: moderator.display_name ?? undefined,
    bio: moderator.bio ?? undefined,
    location: moderator.location ?? undefined,
    website_url: moderator.website_url ?? undefined,
    profile_picture_url: moderator.profile_picture_url ?? undefined,
    email_verified: moderator.email_verified,
    status: moderator.status,
    moderation_permissions: moderator.moderation_permissions,
    profile_visibility: moderator.profile_visibility,
    activity_visibility: moderator.activity_visibility,
    last_login_at: moderator.last_login_at
      ? toISOStringSafe(moderator.last_login_at)
      : undefined,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at: moderator.deleted_at
      ? toISOStringSafe(moderator.deleted_at)
      : undefined,
  };
}
