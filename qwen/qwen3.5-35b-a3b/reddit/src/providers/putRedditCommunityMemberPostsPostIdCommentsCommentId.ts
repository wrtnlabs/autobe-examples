import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommentTransformer } from "../transformers/RedditCommunityCommentTransformer";
import { RedditCommunityPostAtSummaryTransformer } from "../transformers/RedditCommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IUpdate;
}): Promise<IRedditCommunityComment> {
  const { member, postId, commentId, body } = props;
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: commentId },
      select: {
        id: true,
        body: true,
        reddit_community_members_id: true,
        reddit_community_posts_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        votes: true,
        author: {
          select: {
            id: true,
            username: true,
            created_at: true,
            karma: {
              select: { current_score: true },
            },
            userAvatarFiles: {
              select: {
                id: true,
                created_at: true,
              },
            },
          },
        },
        post: RedditCommunityPostAtSummaryTransformer.select(),
        parent: {
          select: {
            id: true,
            created_at: true,
            votes: true,
            parent_comment_id: true,
            author: {
              select: {
                id: true,
                username: true,
                created_at: true,
                karma: { select: { current_score: true } },
                userAvatarFiles: { select: { id: true, created_at: true } },
              },
            },
          },
        },
        replies: {
          select: {
            id: true,
            created_at: true,
            votes: true,
            parent_comment_id: true,
            author: {
              select: {
                id: true,
                username: true,
                created_at: true,
                karma: { select: { current_score: true } },
                userAvatarFiles: { select: { id: true, created_at: true } },
              },
            },
          },
        },
      },
    });
  if (comment.reddit_community_members_id !== member.id) {
    throw new HttpException("You can only edit your own comments", 403);
  }
  if (comment.reddit_community_posts_id !== postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      403,
    );
  }
  if (body.body === undefined) {
    throw new HttpException("Comment body must not be empty", 400);
  }
  await MyGlobal.prisma.reddit_community_comments.update({
    where: { id: commentId },
    data: {
      body: body.body,
      updated_at: new Date(),
    },
  });
  const updatedComment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: commentId },
      select: {
        id: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        votes: true,
        author: {
          select: {
            id: true,
            username: true,
            created_at: true,
            karma: {
              select: { current_score: true },
            },
            userAvatarFiles: {
              select: {
                id: true,
                created_at: true,
              },
            },
          },
        },
        post: RedditCommunityPostAtSummaryTransformer.select(),
        parent: {
          select: {
            id: true,
            created_at: true,
            votes: true,
            parent_comment_id: true,
            author: {
              select: {
                id: true,
                username: true,
                created_at: true,
                karma: { select: { current_score: true } },
                userAvatarFiles: { select: { id: true, created_at: true } },
              },
            },
          },
        },
        replies: {
          select: {
            id: true,
            created_at: true,
            votes: true,
            parent_comment_id: true,
            author: {
              select: {
                id: true,
                username: true,
                created_at: true,
                karma: { select: { current_score: true } },
                userAvatarFiles: { select: { id: true, created_at: true } },
              },
            },
          },
        },
      },
    });
  return await RedditCommunityCommentTransformer.transform(updatedComment);
}
