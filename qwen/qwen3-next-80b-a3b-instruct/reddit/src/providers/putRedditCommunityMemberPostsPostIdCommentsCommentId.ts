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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommentTransformer } from "../transformers/RedditCommunityCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IUpdate;
}): Promise<IRedditCommunityComment> {
  // Find comment to verify ownership and lock status
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        author_id: true,
        post_id: true,
        deleted_at: true,
      },
    });
  // Verify post is not locked by fetching post separately
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: comment.post_id },
    select: { is_deleted: true },
  });
  // Confirm user owns this comment
  if (comment.author_id !== props.member.id) {
    throw new HttpException("Forbidden: Comment does not belong to user", 403);
  }
  // Verify post is not locked
  if (post.is_deleted) {
    throw new HttpException(
      "Forbidden: Cannot edit comment on locked post",
      403,
    );
  }
  // Ensure comment is not deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Forbidden: Cannot edit deleted comment", 403);
  }
  // Validate postId matches comment's post_id (ensures integrity)
  if (comment.post_id !== props.postId) {
    throw new HttpException(
      "Forbidden: Comment does not belong to specified post",
      403,
    );
  }
  // Update content (updated_at is handled by DB trigger or defaults — no manual assignment)
  await MyGlobal.prisma.reddit_community_comments.update({
    where: { id: props.commentId },
    data: { content: props.body.content },
  });
  // Fetch full updated comment with relationships
  const updated =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...RedditCommunityCommentTransformer.select(),
    });
  // Transform to response DTO — dates handled automatically by transformer
  return await RedditCommunityCommentTransformer.transform(updated);
}
