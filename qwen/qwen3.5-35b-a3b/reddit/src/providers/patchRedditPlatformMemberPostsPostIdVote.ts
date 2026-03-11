import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditPlatformPost.IVoteRequest;
}): Promise<IRedditPlatformPost.ISummary> {
  const { member, postId, body } = props;
  if (
    body.vote_type !== null &&
    body.vote_type !== "UPVOTE" &&
    body.vote_type !== "DOWNVOTE"
  ) {
    throw new HttpException("Invalid vote_type", 400);
  }
  const post = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
    where: {
      id: postId,
      deleted_at: null,
    },
    select: {
      id: true,
      reddit_platform_community_id: true,
      vote_score: true,
    },
  });
  const ban = await MyGlobal.prisma.reddit_platform_community_bans.findFirst({
    where: {
      community_id: post.reddit_platform_community_id,
      user_id: member.id,
      deleted_at: null,
      expires_at: null,
    },
  });
  if (ban) {
    throw new HttpException("You are banned from this community", 403);
  }
  const existingVote =
    await MyGlobal.prisma.reddit_platform_post_votes.findFirst({
      where: {
        post_id: postId,
        user_id: member.id,
      },
    });
  let delta: number = 0;
  if (existingVote) {
    if (body.vote_type === null) {
      delta =
        existingVote.vote_type === "UPVOTE"
          ? -1
          : existingVote.vote_type === "DOWNVOTE"
            ? 1
            : 0;
    } else if (
      existingVote.vote_type === "UPVOTE" &&
      body.vote_type === "DOWNVOTE"
    ) {
      delta = -2;
    } else if (
      existingVote.vote_type === "DOWNVOTE" &&
      body.vote_type === "UPVOTE"
    ) {
      delta = 2;
    }
    await MyGlobal.prisma.reddit_platform_post_votes.update({
      where: {
        id: existingVote.id,
      },
      data: {
        vote_type: body.vote_type ?? undefined,
        updated_at: toISOStringSafe(new Date()),
        deleted_at:
          body.vote_type === null ? toISOStringSafe(new Date()) : null,
      },
    });
  } else if (body.vote_type !== null) {
    delta = body.vote_type === "UPVOTE" ? 1 : -1;
    await MyGlobal.prisma.reddit_platform_post_votes.create({
      data: {
        id: v4(),
        post_id: postId,
        user_id: member.id,
        vote_type: body.vote_type,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
    });
  }
  await MyGlobal.prisma.reddit_platform_posts.update({
    where: {
      id: postId,
    },
    data: {
      vote_score: post.vote_score + delta,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const updatedPost =
    await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
      where: {
        id: postId,
      },
      include: {
        author: true,
        community: {
          include: {
            owner: true,
          },
        },
      },
    });
  return {
    id: updatedPost.id,
    title: updatedPost.title,
    post_type: typia.assert<"TEXT" | "LINK" | "IMAGE">(updatedPost.post_type),
    vote_score: updatedPost.vote_score,
    comment_count: updatedPost.comment_count,
    author: {
      id: updatedPost.author.id,
      username: updatedPost.author.username,
      display_name: updatedPost.author.display_name,
      karma_score: updatedPost.author.karma_score,
      is_active: updatedPost.author.is_active,
      created_at: toISOStringSafe(updatedPost.author.created_at),
    } satisfies IRedditPlatformMember.ISummary,
    community: {
      id: updatedPost.community.id,
      name: updatedPost.community.name,
      description: updatedPost.community.description,
      icon_url: updatedPost.community.icon_url,
      subscriber_count: updatedPost.community.subscriber_count,
      created_at: toISOStringSafe(updatedPost.community.created_at),
      owner: {
        id: updatedPost.community.owner.id,
        username: updatedPost.community.owner.username,
        display_name: updatedPost.community.owner.display_name,
        karma_score: updatedPost.community.owner.karma_score,
        is_active: updatedPost.community.owner.is_active,
        created_at: toISOStringSafe(updatedPost.community.owner.created_at),
      } satisfies IRedditPlatformMember.ISummary,
    } satisfies IRedditPlatformCommunity.ISummary,
    created_at: toISOStringSafe(updatedPost.created_at),
  } satisfies IRedditPlatformPost.ISummary;
}
