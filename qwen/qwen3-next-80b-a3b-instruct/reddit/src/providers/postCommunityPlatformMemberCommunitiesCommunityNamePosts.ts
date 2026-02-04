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
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostCollector } from "../collectors/CommunityPlatformPostCollector";
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";

export async function postCommunityPlatformMemberCommunitiesCommunityNamePosts(props: {
  member: MemberPayload;
  communityName: string;
  body: ICommunityPlatformPost.ICreate;
}): Promise<ICommunityPlatformPost> {
  // Verify community exists and get its ID
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { name: props.communityName },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Verify user is subscribed to this community
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findFirst({
      where: {
        member: { id: props.member.id },
        community: { id: community.id },
      },
    });
  if (!subscription) {
    throw new HttpException("You are not subscribed to this community", 403);
  }
  // Use Collector to transform API DTO to Prisma CreateInput
  const created = await MyGlobal.prisma.community_platform_posts.create({
    data: await CommunityPlatformPostCollector.collect({
      body: props.body,
      communityPlatformMembers: {
        id: props.member.id,
      },
      communityPlatformMemberSessions: {
        id: props.member.session_id,
      },
      communityPlatformCommunities: {
        id: community.id,
      },
    }),
    ...CommunityPlatformPostAtSummaryTransformer.select(),
  });
  // Use Transformer to convert database result to API response DTO
  return typia.assert<ICommunityPlatformPost>(
    await CommunityPlatformPostAtSummaryTransformer.transform(created),
  );
}
