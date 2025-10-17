import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function getRedditCommunityCommunityModeratorCommunitiesCommunityIdCommunityModeratorsModeratorId(props: {
  communityModerator: CommunitymoderatorPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommunityModerator> {
  const { communityModerator, communityId, moderatorId } = props;

  const record =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirstOrThrow(
      {
        where: {
          id: moderatorId,
          community_id: communityId,
        },
        include: {
          member: true,
        },
      },
    );

  const member = record.member;

  return {
    id: member.id,
    email: member.email,
    is_email_verified: member.is_email_verified,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at:
      member.deleted_at !== null && member.deleted_at !== undefined
        ? toISOStringSafe(member.deleted_at)
        : null,
  };
}
