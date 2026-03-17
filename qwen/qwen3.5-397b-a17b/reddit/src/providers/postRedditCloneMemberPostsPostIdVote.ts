import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditClonePostVoteCollector } from "../collectors/RedditClonePostVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostVoteTransformer } from "../transformers/RedditClonePostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePostVote.ICreate;
}): Promise<IRedditClonePostVote> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Step 1: Verify post exists and get author/community info
    const post = await tx.reddit_clone_posts.findUniqueOrThrow({
      where: { id: props.postId },
      select: { id: true, member_id: true, community_id: true },
    });
    // Step 2: Check if member is banned from the community
    const ban = await tx.reddit_clone_bans.findFirst({
      where: {
        community_id: post.community_id,
        member_id: props.member.id,
        deleted_at: null,
      },
    });
    if (ban !== null) {
      throw new HttpException("You are banned from this community", 403);
    }
    // Step 3: Prevent self-voting
    if (post.member_id === props.member.id) {
      throw new HttpException("Cannot vote on your own post", 400);
    }
    // Step 4: Check for existing active vote
    const existingVote = await tx.reddit_clone_votes.findFirst({
      where: {
        member_id: props.member.id,
        target_type: "POST",
        target_id: props.postId,
        deleted_at: null,
      },
    });
    // Step 5: Handle vote operation
    if (existingVote !== null) {
      if (props.body.vote_type === null) {
        // Remove vote - soft delete
        await tx.reddit_clone_votes.update({
          where: { id: existingVote.id },
          data: {
            deleted_at: new Date(),
            updated_at: new Date(),
          },
        });
      } else if (existingVote.vote_type !== props.body.vote_type) {
        // Change vote type
        await tx.reddit_clone_votes.update({
          where: { id: existingVote.id },
          data: {
            vote_type: props.body.vote_type,
            updated_at: new Date(),
          },
        });
      }
      // If same vote_type, no change needed
    } else if (props.body.vote_type !== null) {
      // Create new vote using collector
      await tx.reddit_clone_votes.create({
        data: await RedditClonePostVoteCollector.collect({
          body: props.body,
          redditCloneMembers: { id: props.member.id },
          redditClonePosts: { id: props.postId },
        }),
      });
    }
    // Step 6: Calculate post vote score (upvotes - downvotes)
    const votes = await tx.reddit_clone_votes.findMany({
      where: {
        target_type: "POST",
        target_id: props.postId,
        deleted_at: null,
      },
      select: { vote_type: true },
    });
    const postVoteScore = votes.reduce((score, vote) => {
      if (vote.vote_type === "UPVOTE") return score + 1;
      if (vote.vote_type === "DOWNVOTE") return score - 1;
      return score;
    }, 0);
    // Step 7: Get the vote record and transform
    // If vote was removed, we still return the soft-deleted record with null vote_type
    const voteRecord = await tx.reddit_clone_votes.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        target_type: "POST",
        target_id: props.postId,
      },
      orderBy: { created_at: "desc" },
      ...RedditClonePostVoteTransformer.select(),
    });
    return await RedditClonePostVoteTransformer.transform(
      voteRecord,
      postVoteScore,
    );
  });
}
