import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommunityCollector } from "../collectors/RedditCommunityCommunityCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommunityTransformer } from "../transformers/RedditCommunityCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberCommunities(props: {
  member: MemberPayload;
  body: IRedditCommunityCommunity.ICreate;
}): Promise<IRedditCommunityCommunity> {
  // Validate name format using same pattern as DTO
  const namePattern = /^[a-zA-Z0-9_-]+$/;
  if (
    props.body.name.length < 3 ||
    props.body.name.length > 50 ||
    !namePattern.test(props.body.name)
  ) {
    throw new HttpException("REDDIT_COMMUNITY_NAME_INVALID", 400);
  }
  // Check for existing community name (case-insensitive)
  const existing =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: props.body.name.toLowerCase() },
    });
  if (existing) {
    throw new HttpException("REDDIT_COMMUNITY_NAME_TAKEN", 409);
  }
  // Use Collector to create data - properly typed
  const communityData = await RedditCommunityCommunityCollector.collect({
    body: props.body,
    redditCommunityMembers: { id: props.member.id },
  });
  // Use transaction to ensure atomically create community and subscription
  const [created, _] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.reddit_community_communities.create({
      data: communityData,
    }),
    MyGlobal.prisma.reddit_community_subscriptions.create({
      data: {
        id: v4(),
        created_at: new Date(),
        user: { connect: { id: props.member.id } },
        community: { connect: { id: communityData.id } },
      },
    }),
  ]);
  // Fetch the full community with required relations before transformation
  const fullCommunityData =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { id: created.id },
      ...RedditCommunityCommunityTransformer.select(),
    });
  if (!fullCommunityData) {
    throw new HttpException("COMMUNITY_NOT_FOUND", 404);
  }
  // Transform and return full community object using defined transformer
  const fullCommunity =
    await RedditCommunityCommunityTransformer.transform(fullCommunityData);
  return fullCommunity;
}
