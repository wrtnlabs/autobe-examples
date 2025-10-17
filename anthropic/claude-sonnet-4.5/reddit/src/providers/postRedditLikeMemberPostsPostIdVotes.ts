import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postRedditLikeMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikePostVote.ICreate;
}): Promise<IRedditLikePostVote> {
  const { member, postId, body } = props;

  const post = await MyGlobal.prisma.reddit_like_posts.findUnique({
    where: { id: postId },
    select: {
      id: true,
      reddit_like_member_id: true,
      deleted_at: true,
    },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  if (post.deleted_at !== null) {
    throw new HttpException("Cannot vote on deleted post", 400);
  }

  if (post.reddit_like_member_id === member.id) {
    throw new HttpException("Cannot vote on your own post", 403);
  }

  const now = toISOStringSafe(new Date());

  const vote = await MyGlobal.prisma.reddit_like_post_votes.upsert({
    where: {
      reddit_like_member_id_reddit_like_post_id: {
        reddit_like_member_id: member.id,
        reddit_like_post_id: postId,
      },
    },
    create: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_like_member_id: member.id,
      reddit_like_post_id: postId,
      vote_value: body.vote_value,
      created_at: now,
      updated_at: now,
    },
    update: {
      vote_value: body.vote_value,
      updated_at: now,
    },
    select: {
      id: true,
      vote_value: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id: vote.id as string & tags.Format<"uuid">,
    vote_value: vote.vote_value,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
  };
}
