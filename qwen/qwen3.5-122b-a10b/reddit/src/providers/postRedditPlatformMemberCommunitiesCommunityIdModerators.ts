import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommunityModeratorCollector } from "../collectors/RedditPlatformCommunityModeratorCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunityModeratorTransformer } from "../transformers/RedditPlatformCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberCommunitiesCommunityIdModerators(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommunityModerator.ICreate;
}): Promise<IRedditPlatformCommunityModerator> {
  // Verify community exists and is not deleted
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { id: props.communityId },
      select: { id: true, owner_id: true, deleted_at: true },
    });
  if (community === null || community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }
  // Check authorization: requester must be owner or existing moderator
  const isOwner = community.owner_id === props.member.id;
  let isModerator = false;
  if (!isOwner) {
    const existingModerator =
      await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
        where: {
          reddit_platform_member_id: props.member.id,
          reddit_platform_community_id: props.communityId,
          deleted_at: null,
        },
      });
    isModerator = existingModerator !== null;
  }
  if (!isOwner && !isModerator) {
    throw new HttpException(
      "Forbidden: Only community owners or moderators can add moderators",
      403,
    );
  }
  // Verify target member exists and is not deleted
  const targetMember = await MyGlobal.prisma.reddit_platform_members.findUnique(
    {
      where: { id: props.body.member_id },
      select: { id: true, deleted_at: true },
    },
  );
  if (targetMember === null || targetMember.deleted_at !== null) {
    throw new HttpException("Target member not found", 404);
  }
  // Check if target member is already a moderator (unique constraint check)
  const existingModerator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        reddit_platform_member_id: props.body.member_id,
        reddit_platform_community_id: props.communityId,
        deleted_at: null,
      },
    });
  if (existingModerator !== null) {
    throw new HttpException(
      "Member is already a moderator of this community",
      409,
    );
  }
  // Check if target member is banned from this community
  const ban = await MyGlobal.prisma.reddit_platform_community_bans.findFirst({
    where: {
      reddit_platform_member_id: props.body.member_id,
      reddit_platform_community_id: props.communityId,
      deleted_at: null,
    },
  });
  if (ban !== null) {
    throw new HttpException(
      "Cannot add banned member as moderator. Unban first.",
      400,
    );
  }
  // Create moderator assignment using Collector
  const created =
    await MyGlobal.prisma.reddit_platform_community_moderators.create({
      data: await RedditPlatformCommunityModeratorCollector.collect({
        body: props.body,
        redditPlatformCommunities: { id: props.communityId },
        redditPlatformMembers: { id: props.body.member_id },
        redditPlatformMemberSessions: { id: props.member.session_id },
      }),
      ...RedditPlatformCommunityModeratorTransformer.select(),
    });
  return await RedditPlatformCommunityModeratorTransformer.transform(created);
}
