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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditClonePostsPostIdVotes(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePostImage.IChangeDirection;
}): Promise<IRedditClonePostImage> {
  // Find the existing vote for this member on this post
  const existingVote = await MyGlobal.prisma.reddit_clone_post_votes.findFirst({
    where: {
      reddit_clone_post_id: props.postId,
    },
    select: {
      id: true,
      direction: true,
      created_at: true,
      updated_at: true,
      reddit_clone_member_id: true,
      post: {
        select: {
          id: true,
          reddit_clone_member_id: true,
          vote_score: true,
          deleted_at: true,
        },
      },
    },
  });
  // Check if vote exists
  if (!existingVote) {
    throw new HttpException("You have not voted on this post", 400);
  }
  // Check if post exists and is not deleted
  if (existingVote.post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // Check if the new direction is different from current
  if (existingVote.direction === props.body.direction) {
    throw new HttpException(
      "Vote direction is already set to the requested direction",
      400,
    );
  }
  // Calculate the vote score delta
  const delta = props.body.direction === "upvote" ? 2 : -2;
  // Update vote, post score, and author karma in a transaction
  const updatedVote = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update the vote direction
    const vote = await tx.reddit_clone_post_votes.update({
      where: { id: existingVote.id },
      data: {
        direction: props.body.direction,
        updated_at: new Date(),
      },
      select: {
        id: true,
        direction: true,
        created_at: true,
        updated_at: true,
        member: {
          select: {
            id: true,
            username: true,
            created_at: true,
            karma: {
              select: {
                karma_score: true,
              },
            },
          },
        },
      },
    });
    // Update post vote score
    await tx.reddit_clone_posts.update({
      where: { id: props.postId },
      data: {
        vote_score: existingVote.post.vote_score + delta,
        updated_at: new Date(),
      },
    });
    // Update author karma
    const authorId = existingVote.post.reddit_clone_member_id;
    await tx.reddit_clone_user_karmas.update({
      where: { reddit_clone_member_id: authorId },
      data: {
        karma_score: { increment: delta },
        updated_at: new Date(),
      },
    });
    return vote;
  });
  // Build and return the response
  return {
    id: updatedVote.id,
    direction: updatedVote.direction,
    created_at: updatedVote.created_at.toISOString(),
    updated_at: updatedVote.updated_at.toISOString(),
    member: {
      id: updatedVote.member.id,
      username: updatedVote.member.username,
      created_at: updatedVote.member.created_at.toISOString(),
      karma_count: (updatedVote.member.karma?.karma_score ?? 0) as number &
        tags.Type<"int32">,
      profile: {
        id: "00000000-0000-0000-0000-000000000000" as string &
          tags.Format<"uuid">,
        display_name: updatedVote.member.username,
      },
    },
  };
}
