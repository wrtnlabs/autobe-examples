import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeCommunityModeratorCollector } from "../collectors/RedditLikeCommunityModeratorCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityModeratorTransformer } from "../transformers/RedditLikeCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberCommunitiesCommunityIdModerators(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikeCommunityModerator.ICreate;
}): Promise<IRedditLikeCommunityModerator> {
  // 1. Verify community exists and is not deleted
  const community = await MyGlobal.prisma.reddit_like_communities.findUnique({
    where: { id: props.communityId },
    select: { id: true, owner_id: true, deleted_at: true },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  if (community.deleted_at !== null) {
    throw new HttpException("Community has been deleted", 404);
  }
  // 2. Verify member exists and is not deleted
  const member = await MyGlobal.prisma.reddit_like_members.findUnique({
    where: { id: props.body.member_id },
    select: { id: true, deleted_at: true },
  });
  if (member === null) {
    throw new HttpException("Member not found", 404);
  }
  if (member.deleted_at !== null) {
    throw new HttpException("Member has been deleted", 404);
  }
  // 3. Verify authorization - member must be owner or existing moderator
  const isOwner = community.owner_id === props.member.id;
  let isModerator = false;
  if (!isOwner) {
    const existingModerator =
      await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
        where: {
          reddit_like_community_id: props.communityId,
          reddit_like_member_id: props.member.id,
          deleted_at: null,
        },
        select: { id: true },
      });
    isModerator = existingModerator !== null;
  }
  if (!isOwner && !isModerator) {
    throw new HttpException(
      "Forbidden - only community owner or moderators can add moderators",
      403,
    );
  }
  // 4. Check if member is already a moderator (unique constraint)
  const alreadyModerator =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        reddit_like_community_id: props.communityId,
        reddit_like_member_id: props.body.member_id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (alreadyModerator !== null) {
    throw new HttpException(
      "Member is already a moderator in this community",
      409,
    );
  }
  // 5. Create moderator assignment using collector
  const communityEntity: IEntity = {
    id: props.communityId,
  };
  const record = await MyGlobal.prisma.reddit_like_community_moderators.create({
    data: await RedditLikeCommunityModeratorCollector.collect({
      body: props.body,
      redditLikeCommunities: communityEntity,
    }),
    ...RedditLikeCommunityModeratorTransformer.select(),
  });
  // 6. Return transformed response
  return await RedditLikeCommunityModeratorTransformer.transform(record);
}
