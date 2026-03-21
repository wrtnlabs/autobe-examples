import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneMemberSessionAtSummaryTransformer } from "../transformers/RedditCloneMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditClonePostImage> {
  // Validate post exists and get author info
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_clone_member_id: true,
      vote_score: true,
    },
  });
  // Check for existing vote
  const existingVote = await MyGlobal.prisma.reddit_clone_post_votes.findFirst({
    where: {
      reddit_clone_member_id: props.member.id,
      reddit_clone_post_id: props.postId,
    },
  });
  // If already upvoted, return existing vote (idempotent)
  if (existingVote && existingVote.direction === "upvote") {
    const member = await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow(
      {
        where: { id: props.member.id },
        ...RedditCloneMemberSessionAtSummaryTransformer.select(),
      },
    );
    return {
      id: existingVote.id,
      direction: existingVote.direction,
      created_at: existingVote.created_at.toISOString(),
      updated_at: existingVote.updated_at.toISOString(),
      member:
        await RedditCloneMemberSessionAtSummaryTransformer.transform(member),
    };
  }
  // Use transaction for atomicity
  const voteResult = await MyGlobal.prisma.$transaction(async (tx) => {
    if (existingVote && existingVote.direction === "downvote") {
      // Update downvote to upvote: +2 to score and karma
      const updatedVote = await tx.reddit_clone_post_votes.update({
        where: { id: existingVote.id },
        data: {
          direction: "upvote",
          updated_at: new Date(),
        },
      });
      // Update post vote_score by +2
      await tx.reddit_clone_posts.update({
        where: { id: props.postId },
        data: { vote_score: { increment: 2 } },
      });
      // Update or create author karma +2
      await tx.reddit_clone_user_karmas.upsert({
        where: { reddit_clone_member_id: post.reddit_clone_member_id },
        create: {
          id: v4(),
          reddit_clone_member_id: post.reddit_clone_member_id,
          karma_score: 2,
          created_at: new Date(),
          updated_at: new Date(),
        },
        update: {
          karma_score: { increment: 2 },
          updated_at: new Date(),
        },
      });
      return updatedVote;
    } else {
      // Create new upvote: +1 to score and karma
      const newVote = await tx.reddit_clone_post_votes.create({
        data: {
          id: v4(),
          reddit_clone_member_id: props.member.id,
          reddit_clone_post_id: props.postId,
          direction: "upvote",
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
      // Update post vote_score by +1
      await tx.reddit_clone_posts.update({
        where: { id: props.postId },
        data: { vote_score: { increment: 1 } },
      });
      // Update or create author karma +1
      await tx.reddit_clone_user_karmas.upsert({
        where: { reddit_clone_member_id: post.reddit_clone_member_id },
        create: {
          id: v4(),
          reddit_clone_member_id: post.reddit_clone_member_id,
          karma_score: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
        update: {
          karma_score: { increment: 1 },
          updated_at: new Date(),
        },
      });
      return newVote;
    }
  });
  // Fetch full member data with profile for transformer response
  const member = await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
    where: { id: props.member.id },
    ...RedditCloneMemberSessionAtSummaryTransformer.select(),
  });
  return {
    id: voteResult.id,
    direction: voteResult.direction,
    created_at: voteResult.created_at.toISOString(),
    updated_at: voteResult.updated_at.toISOString(),
    member:
      await RedditCloneMemberSessionAtSummaryTransformer.transform(member),
  };
}
