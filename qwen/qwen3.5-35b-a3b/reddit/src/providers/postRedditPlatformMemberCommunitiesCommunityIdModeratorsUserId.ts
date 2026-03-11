import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunityModeratorTransformer } from "../transformers/RedditPlatformCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberCommunitiesCommunityIdModeratorsUserId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  userId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformCommunityModerator> {
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
    });
  if (community.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
    where: { id: props.userId },
  });
  const existingModerator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.userId,
      },
    });
  if (existingModerator !== null) {
    throw new HttpException("Conflict", 409);
  }
  const moderatorId = v4() as string & tags.Format<"uuid">;
  const created =
    await MyGlobal.prisma.reddit_platform_community_moderators.create({
      data: {
        id: moderatorId,
        community_id: props.communityId,
        user_id: props.userId,
        created_at: new Date(),
        updated_at: new Date(),
      },
      ...RedditPlatformCommunityModeratorTransformer.select(),
    });
  await MyGlobal.prisma.reddit_platform_moderator_histories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_id: props.communityId,
      user_id: props.userId,
      acted_by_id: props.member.id,
      action_type: "APPOINTED",
      created_at: new Date(),
      updated_at: new Date(),
      notes: `Appointed as moderator for ${community.name}`,
    },
  });
  return await RedditPlatformCommunityModeratorTransformer.transform(created);
}
