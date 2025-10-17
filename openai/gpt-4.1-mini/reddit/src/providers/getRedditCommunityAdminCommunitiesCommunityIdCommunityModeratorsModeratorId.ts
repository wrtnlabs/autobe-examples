import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditCommunityAdminCommunitiesCommunityIdCommunityModeratorsModeratorId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommunityModerator> {
  const { communityId, moderatorId } = props;

  const moderator =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        id: moderatorId,
        community_id: communityId,
      },
      include: {
        member: true,
      },
    });

  if (moderator === null) {
    throw new HttpException("Community moderator not found", 404);
  }

  return {
    id: moderator.id,
    email: moderator.member.email,
    is_email_verified: moderator.member.is_email_verified,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at:
      moderator.member.deleted_at !== undefined &&
      moderator.member.deleted_at !== null
        ? toISOStringSafe(moderator.member.deleted_at)
        : null,
  };
}
