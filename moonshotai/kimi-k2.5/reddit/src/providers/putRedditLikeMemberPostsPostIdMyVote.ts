import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikeVoteTransformer } from "../transformers/RedditLikeVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeMemberPostsPostIdMyVote(props: {
  member: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikeVote.IUpdate;
}): Promise<IRedditLikeVote> {
  // Validate post exists and is not deleted
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      author_id: true,
      is_deleted: true,
      deleted_at: true,
    },
  });
  // Cannot vote on deleted content (section 179)
  if (post.is_deleted || post.deleted_at !== null) {
    throw new HttpException("Cannot vote on deleted content", 400);
  }
  // Cannot vote on own posts (section 8)
  if (post.author_id === props.member.id) {
    throw new HttpException("Cannot vote on your own content", 400);
  }
  // Check if member already has a vote on this post
  const existingPostVote =
    await MyGlobal.prisma.reddit_like_post_votes.findFirst({
      where: {
        post: { id: props.postId },
        vote: { member_id: props.member.id },
      },
      select: {
        id: true,
        reddit_like_vote_id: true,
        vote: {
          select: {
            id: true,
            vote_type: true,
          },
        },
      },
    });
  if (existingPostVote) {
    // Update existing vote
    const updatedVote = await MyGlobal.prisma.reddit_like_votes.update({
      where: { id: existingPostVote.vote.id },
      data: {
        vote_type: props.body.vote_type,
        updated_at: new Date(),
      },
      ...RedditLikeVoteTransformer.select(),
    });
    return await RedditLikeVoteTransformer.transform(updatedVote);
  } else {
    // Create new vote and link to post
    const voteId = v4();
    const now = new Date();
    await MyGlobal.prisma.reddit_like_votes.create({
      data: {
        id: voteId,
        member_id: props.member.id,
        vote_type: props.body.vote_type,
        created_at: now,
        updated_at: now,
        postVote: {
          create: {
            id: v4(),
            post: { connect: { id: props.postId } },
            created_at: now,
            updated_at: now,
          },
        },
      },
    });
    // Fetch the created vote with transformer select
    const createdVote =
      await MyGlobal.prisma.reddit_like_votes.findUniqueOrThrow({
        where: { id: voteId },
        ...RedditLikeVoteTransformer.select(),
      });
    return await RedditLikeVoteTransformer.transform(createdVote);
  }
}
