import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditCommunityAdminRedditCommunityModeratorsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityModerator> {
  const moderator =
    await MyGlobal.prisma.reddit_community_moderators.findUnique({
      where: { id: props.id },
    });

  if (moderator === null) {
    throw new HttpException("redditCommunityModerator not found", 404);
  }

  return {
    id: moderator.id,
    email: moderator.email,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at:
      moderator.deleted_at === null
        ? null
        : toISOStringSafe(moderator.deleted_at),
  };
}
