import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumPostCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostCommentVote";
import { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postCommunityForumUserCommentsCommentIdVotes(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityForumPostCommentVote.ICreate;
}): Promise<ICommunityForumPostCommentVote> {
  // Check if the comment exists and is not deleted
  const comment = await MyGlobal.prisma.community_forum_comments.findUnique({
    where: {
      id: props.commentId,
      deleted_at: null,
    },
    include: {
      author: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found or has been deleted", 404);
  }

  // Prevent users from voting on their own comments
  if (comment.community_forum_user_id === props.user.id) {
    throw new HttpException("You cannot vote on your own comment", 400);
  }

  // Check if user has already voted on this comment
  const existingVote =
    await MyGlobal.prisma.community_forum_comment_votes.findUnique({
      where: {
        community_forum_user_id_community_forum_comment_id: {
          community_forum_user_id: props.user.id,
          community_forum_comment_id: props.commentId,
        },
      },
    });

  if (existingVote) {
    throw new HttpException("You have already voted on this comment", 400);
  }

  // Create the vote
  const createdVote =
    await MyGlobal.prisma.community_forum_comment_votes.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        is_upvote: props.body.is_upvote,
        community_forum_user_id: props.user.id,
        community_forum_comment_id: props.commentId,
        created_at: new Date(),
      },
    });

  // Fetch the complete vote with related data
  const voteWithRelations =
    await MyGlobal.prisma.community_forum_comment_votes.findUnique({
      where: { id: createdVote.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        comment: {
          select: {
            id: true,
            body: true,
            created_at: true,
            updated_at: true,
            author: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

  if (!voteWithRelations) {
    throw new HttpException("Failed to retrieve created vote", 500);
  }

  // Return the formatted vote
  return {
    id: voteWithRelations.id,
    is_upvote: voteWithRelations.is_upvote,
    created_at: toISOStringSafe(voteWithRelations.created_at),
    user: {
      id: voteWithRelations.user.id,
      username: voteWithRelations.user.username,
    },
    comment: {
      id: voteWithRelations.comment.id,
      body: voteWithRelations.comment.body,
      created_at: toISOStringSafe(voteWithRelations.comment.created_at),
      updated_at: toISOStringSafe(voteWithRelations.comment.updated_at),
      author: {
        id: voteWithRelations.comment.author.id,
        username: voteWithRelations.comment.author.username,
      },
    },
  };
}
