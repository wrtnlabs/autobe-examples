import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityBanCollector } from "../collectors/RedditCommunityBanCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityBanTransformer } from "../transformers/RedditCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberCommunitiesCommunityNameBans(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditCommunityBan.ICreate;
}): Promise<IRedditCommunityBan> {
  // Resolve community by name
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: props.communityName },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Verify requesting member is owner or moderator
  const isOwner = community.reddit_community_member_id === props.member.id;
  const isModerator =
    await MyGlobal.prisma.reddit_community_moderators.findFirst({
      where: {
        community_id: community.id,
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (!isOwner && !isModerator) {
    throw new HttpException(
      "Forbidden: Only community owners and moderators can ban users",
      403,
    );
  }
  // Verify target member exists
  const targetMember =
    await MyGlobal.prisma.reddit_community_members.findUnique({
      where: { id: props.body.reddit_community_member_id },
    });
  if (targetMember === null) {
    throw new HttpException("Target member not found", 404);
  }
  // Check unique constraint: ensure target member is not already banned (active ban)
  const existingBan = await MyGlobal.prisma.reddit_community_bans.findFirst({
    where: {
      reddit_community_community_id: community.id,
      reddit_community_member_id: props.body.reddit_community_member_id,
      deleted_at: null,
    },
  });
  if (existingBan !== null) {
    throw new HttpException("User is already banned from this community", 409);
  }
  // Create ban record using collector
  const created = await MyGlobal.prisma.reddit_community_bans.create({
    data: await RedditCommunityBanCollector.collect({
      body: props.body,
      redditCommunityCommunities: { id: community.id },
      redditCommunityMembers: { id: props.member.id },
    }),
    ...RedditCommunityBanTransformer.select(),
  });
  // Transform and return response
  return await RedditCommunityBanTransformer.transform(created);
}
