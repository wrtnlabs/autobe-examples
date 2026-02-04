import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommunityTransformer } from "../transformers/CommunityPlatformCommunityTransformer";

export async function putCommunityPlatformModeratorCommunitiesCommunityCode(props: {
  moderator: ModeratorPayload;
  communityCode: string;
  body: ICommunityPlatformCommunity.IUpdate;
}): Promise<ICommunityPlatformCommunity> {
  // Verify community exists and get its internal id
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.communityCode },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Verify moderator is authorized (either owner or moderator)
  // For owners: query community_platform_owners with community_id = community.id and member_id = props.moderator.id
  const isAuthorized =
    await MyGlobal.prisma.community_platform_owners.findFirst({
      where: {
        community_id: community.id, // ✅ Corrected: Use actual field name instead of 'community'
        member_id: props.moderator.id,
        deleted_at: null,
        community_platform_member_sessions: {
          some: {
            id: props.moderator.session_id,
            expired_at: { gt: new Date() },
          },
        },
      },
    });
  if (!isAuthorized) {
    // For moderators: query community_platform_moderators with community_id = community.id and member_id = props.moderator.id
    const isModerator =
      await MyGlobal.prisma.community_platform_moderators.findFirst({
        where: {
          community_id: community.id, // ✅ Corrected: Use actual field name instead of 'community'
          member_id: props.moderator.id,
          deleted_at: null,
          community_platform_member_sessions: {
            some: {
              id: props.moderator.session_id,
              expired_at: { gt: new Date() },
            },
          },
        },
      });
    if (!isModerator) {
      throw new HttpException(
        "Forbidden - You are not authorized to update this community",
        403,
      );
    }
  }
  // Return the community using transformer
  return CommunityPlatformCommunityTransformer.transform(community);
}
