import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfile";
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

export async function postRedditMemberCommunitiesCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string;
  body: IRedditCommunityBan.ICreate;
}): Promise<IRedditCommunityBan> {
  const community = await MyGlobal.prisma.reddit_communities.findUnique({
    where: { id: props.communityId },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  if (community.reddit_member_id !== props.member.id) {
    throw new HttpException("You're not authorized to ban users", 403);
  }
  const userToBan = await MyGlobal.prisma.reddit_profiles.findUnique({
    where: { id: props.body.user_id },
  });
  if (!userToBan) {
    throw new HttpException("User to ban not found", 404);
  }
  const existingBan = await MyGlobal.prisma.reddit_community_bans.findFirst({
    where: {
      community_id: props.communityId,
      user_id: props.body.user_id,
      deleted_at: null,
    },
  });
  if (existingBan) {
    throw new HttpException("User is already banned from this community", 409);
  }
  const data = await RedditCommunityBanCollector.collect({
    body: props.body,
    redditCommunities: {
      id: props.communityId,
    },
  });
  const created = await MyGlobal.prisma.reddit_community_bans.create({
    data,
    ...RedditCommunityBanTransformer.select(),
  });
  return await RedditCommunityBanTransformer.transform(created);
}
