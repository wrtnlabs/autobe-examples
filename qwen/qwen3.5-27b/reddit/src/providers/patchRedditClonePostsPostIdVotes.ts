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
import { RedditClonePostVoteTransformer } from "../transformers/RedditClonePostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditClonePostsPostIdVotes(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePostVote.IRequest;
  member: {
    id: string & tags.Format<"uuid">;
  };
}): Promise<IRedditClonePostVote> {
  // Verify post exists and is not soft-deleted
  await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  });
  const memberId = props.member.id;
  // Find existing active vote for this member on this post
  const existingVote = await MyGlobal.prisma.reddit_clone_post_votes.findFirst({
    where: {
      reddit_clone_post_id: props.postId,
      reddit_clone_member_id: memberId,
      deleted_at: null,
    },
  });
  const now = new Date();
  if (props.body.vote_type !== undefined && props.body.vote_type !== null) {
    // Cast or change vote
    if (existingVote) {
      // Update existing vote
      await MyGlobal.prisma.reddit_clone_post_votes.update({
        where: { id: existingVote.id },
        data: {
          vote_type: props.body.vote_type,
          updated_at: now,
        },
      });
    } else {
      // Create new vote
      await MyGlobal.prisma.reddit_clone_post_votes.create({
        data: {
          id: v4(),
          reddit_clone_post_id: props.postId,
          reddit_clone_member_id: memberId,
          vote_type: props.body.vote_type,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    }
  } else if (existingVote) {
    // Remove vote (soft delete)
    await MyGlobal.prisma.reddit_clone_post_votes.update({
      where: { id: existingVote.id },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
  }
  // Retrieve the current vote state
  const vote = await MyGlobal.prisma.reddit_clone_post_votes.findFirst({
    ...RedditClonePostVoteTransformer.select(),
    where: {
      reddit_clone_post_id: props.postId,
      reddit_clone_member_id: memberId,
    },
  });
  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }
  return await RedditClonePostVoteTransformer.transform(vote);
}
