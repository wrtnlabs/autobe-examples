import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostVoteTransformer } from "../transformers/RedditClonePostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberPostsPostIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: IRedditClonePostVote.IUpdate;
}): Promise<IRedditClonePostVote> {
  // Find the vote and verify ownership
  const vote = await MyGlobal.prisma.reddit_clone_post_votes.findUniqueOrThrow({
    where: {
      id: props.voteId,
    },
    select: {
      id: true,
      reddit_clone_post_id: true,
      reddit_clone_member_id: true,
      deleted_at: true,
    },
  });
  // Verify the authenticated member owns this vote
  if (vote.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify the vote is not soft-deleted
  if (vote.deleted_at !== null) {
    throw new HttpException("Vote not found", 404);
  }
  // Verify the vote's post_id matches the provided postId
  if (vote.reddit_clone_post_id !== props.postId) {
    throw new HttpException("Vote not found", 404);
  }
  // Verify the post is not deleted
  const post = await MyGlobal.prisma.reddit_clone_posts.findUnique({
    where: {
      id: props.postId,
    },
    select: {
      deleted_at: true,
    },
  });
  if (post === null || post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // Update the vote
  await MyGlobal.prisma.reddit_clone_post_votes.update({
    where: {
      id: props.voteId,
    },
    data: {
      vote_type: props.body.vote_type,
      updated_at: new Date(),
    },
  });
  // Fetch the updated vote with all relations
  const updated =
    await MyGlobal.prisma.reddit_clone_post_votes.findUniqueOrThrow({
      where: {
        id: props.voteId,
      },
      ...RedditClonePostVoteTransformer.select(),
    });
  // Transform and return the result
  return await RedditClonePostVoteTransformer.transform(updated);
}
