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
import { CommunityPlatformPostCollector } from "../collectors/CommunityPlatformPostCollector";
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";

export async function postCommunityPlatformCommunitiesCommunityCodePostsNew(props: {
  communityCode: string;
  body: ICommunityPlatformPost.ICreate;
}): Promise<ICommunityPlatformPost> {
  // Validate that the community exists and retrieve its ID
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { code: props.communityCode },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Validate exactly one of text, url, or image is provided
  const contentProvided = [
    props.body.text !== undefined,
    props.body.url !== undefined,
    props.body.image !== undefined,
  ].filter(Boolean).length;
  if (contentProvided === 0) {
    throw new HttpException(
      "Exactly one of text, url, or image must be provided",
      400,
    );
  }
  if (contentProvided > 1) {
    throw new HttpException(
      "Only one of text, url, or image can be provided",
      400,
    );
  }
  // Use collector to transform API DTO into database-ready input
  // The actor and session context are injected automatically by the system
  // and are guaranteed to be available in the authenticated context
  const created = await MyGlobal.prisma.community_platform_posts.create({
    data: await CommunityPlatformPostCollector.collect({
      body: props.body,
      communityPlatformMembers: { id: MyGlobal.actor.id },
      communityPlatformMemberSessions: { id: MyGlobal.session.id },
      communityPlatformCommunities: { id: community.id },
    }),
    ...CommunityPlatformPostAtSummaryTransformer.select(),
  });
  // Extract the full content_type from the input body
  const content_type: "text" | "link" | "image" = props.body.text
    ? "text"
    : props.body.url
      ? "link"
      : props.body.image
        ? "image"
        : "text";
  // Construct ICommunityPlatformPost by combining details from created (DB) and input (DTO)
  const fullPost: ICommunityPlatformPost = {
    id: created.id,
    created_at: toISOStringSafe(created.created_at),
    title: created.title,
    content_type,
    score: created.vote_score,
    comment_count: created.comment_count,
    author: {
      id: created.author.id,
    },
    community: {
      name: created.community.name,
      description: created.community.description,
      icon: created.community.icon as string & tags.Format<"uri">,
      subscriber_count: created.community.subscriber_count,
      created_at: toISOStringSafe(created.community.created_at),
    },
  };
  return fullPost;
}
