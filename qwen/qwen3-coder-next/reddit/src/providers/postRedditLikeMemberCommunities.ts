import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeCommunityCollector } from "../collectors/RedditLikeCommunityCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityTransformer } from "../transformers/RedditLikeCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberCommunities(props: {
  member: MemberPayload;
  body: IRedditLikeCommunity.ICreate;
}): Promise<IRedditLikeCommunity> {
  const community = await MyGlobal.prisma.reddit_like_communities.create({
    data: await RedditLikeCommunityCollector.collect({
      body: props.body,
      seller: { id: props.member.id },
    }),
    select: RedditLikeCommunityTransformer.select().select,
  });
  // Create ModeratorRole to establish owner relationship
  await MyGlobal.prisma.reddit_like_moderator_roles.create({
    data: {
      id: v4(),
      role: "owner" as const,
      created_at: new Date(),
      community: { connect: { id: community.id } },
      user: { connect: { id: props.member.id } },
    },
  });
  // Auto-subscribe the creator
  await MyGlobal.prisma.reddit_like_subscriptions.create({
    data: {
      id: v4(),
      status: "subscribed" as const,
      created_at: new Date(),
      updated_at: new Date(),
      community: { connect: { id: community.id } },
      member: { connect: { id: props.member.id } },
    },
  });
  return await RedditLikeCommunityTransformer.transform(community);
}
