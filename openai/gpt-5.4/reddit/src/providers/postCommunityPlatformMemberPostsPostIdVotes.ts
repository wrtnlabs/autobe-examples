import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostVoteCollector } from "../collectors/CommunityPlatformPostVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostVoteTransformer } from "../transformers/CommunityPlatformPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.ICreate;
}): Promise<ICommunityPlatformPostVote> {
  if (
    props.body.direction !== "upvote" &&
    props.body.direction !== "downvote"
  ) {
    throw new HttpException("Unsupported vote direction", 400);
  }
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        status: true,
        deleted_at: true,
        community_platform_member_id: true,
      },
    },
  );
  if (post.deleted_at !== null) {
    throw new HttpException("Post is unavailable", 400);
  }
  if (post.status !== "active" && post.status !== "published") {
    throw new HttpException("Post is not voteable", 400);
  }
  const now = toISOStringSafe(new Date());
  const vote = await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.community_platform_post_votes.findUnique({
      where: {
        community_platform_member_id_community_platform_post_id: {
          community_platform_member_id: props.member.id,
          community_platform_post_id: props.postId,
        },
      },
      select: {
        id: true,
        direction: true,
        deleted_at: true,
      },
    });
    if (existing === null) {
      await tx.community_platform_post_votes.create({
        data: await CommunityPlatformPostVoteCollector.collect({
          body: props.body,
          member: { id: props.member.id },
          post: { id: post.id },
        }),
      });
    } else {
      await tx.community_platform_post_votes.update({
        where: { id: existing.id },
        data: {
          direction: props.body.direction,
          updated_at: now,
          deleted_at: null,
        },
      });
    }
    return await tx.community_platform_post_votes.findUniqueOrThrow({
      where: {
        community_platform_member_id_community_platform_post_id: {
          community_platform_member_id: props.member.id,
          community_platform_post_id: props.postId,
        },
      },
      ...CommunityPlatformPostVoteTransformer.select(),
    });
  });
  return await CommunityPlatformPostVoteTransformer.transform(vote);
}
