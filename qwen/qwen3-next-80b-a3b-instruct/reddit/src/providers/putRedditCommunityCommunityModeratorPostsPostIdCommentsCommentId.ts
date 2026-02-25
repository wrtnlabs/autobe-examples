import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";
import { RedditCommunityCommentTransformer } from "../transformers/RedditCommunityCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityCommunityModeratorPostsPostIdCommentsCommentId(props: {
  communityModerator: CommunitymoderatorPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IUpdate;
}): Promise<IRedditCommunityComment> {
  // Fetch the comment to validate ownership and status
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        content: true,
        author_id: true,
        post_id: true,
        deleted_at: true,
      },
    });
  // Fetch the post to check deletion status
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { is_deleted: true },
  });
  // Verify comment belongs to the specified post
  if (comment.post_id !== props.postId) {
    throw new HttpException("Comment does not belong to this post", 400);
  }
  // Verify comment is not deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Cannot update a deleted comment", 403);
  }
  // Verify post is not deleted (locked)
  if (post.is_deleted) {
    throw new HttpException("Cannot update comments on a deleted post", 403);
  }
  // Verify moderator is updating their own comment
  if (comment.author_id !== props.communityModerator.id) {
    throw new HttpException(
      "Forbidden: You can only update your own comments",
      403,
    );
  }
  // Validate content length
  if (props.body.content.length < 1 || props.body.content.length > 2000) {
    throw new HttpException(
      "Comment content must be between 1 and 2000 characters",
      400,
    );
  }
  // Update comment using proper date-time string format
  const updated = await MyGlobal.prisma.reddit_community_comments.update({
    where: { id: props.commentId },
    data: {
      content: props.body.content,
      updated_at: new Date().toISOString(),
    },
    ...RedditCommunityCommentTransformer.select(),
  });
  return await RedditCommunityCommentTransformer.transform(updated);
}
