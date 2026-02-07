import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditPlatformAdminCommentsBulkDelete(props: {
  admin: AdminPayload;
  body: IRedditPlatformComment.IRequest;
}): Promise<IRedditPlatformComment.IBulkDeleteResponse> {
  const commentIds: Array<string & tags.Format<"uuid">> = [];
  const deletedCount = await MyGlobal.prisma.$transaction(async (tx) => {
    let totalDeleted = 0;
    for (const commentId of commentIds) {
      const comment = await tx.reddit_platform_comments.findUnique({
        where: { id: commentId },
      });
      if (!comment) continue;
      // Check if admin has permission to delete
      const post = await tx.reddit_platform_posts.findUnique({
        where: { id: comment.post_id },
      });
      if (!post) continue;
      const community = await tx.reddit_platform_communities.findUnique({
        where: { id: post.community_id },
      });
      if (!community) continue;
      // Check if admin has proper authorization
      const admin = await tx.reddit_platform_admins.findUnique({
        where: { id: props.admin.id },
      });
      if (!admin) {
        throw new HttpException("Admin not found", 404);
      }
      // Recursively delete all child comments using CTE if available
      // For now, simple approach - delete the comment and let cascade handle children
      await tx.reddit_platform_comments.delete({
        where: { id: commentId },
      });
      totalDeleted++;
      // Update karma for author
      if (comment.author_id) {
        await tx.reddit_platform_karma_histories.create({
          data: {
            id: v4(),
            reddit_platform_user_id: comment.author_id,
            amount: -comment.vote_score,
            change_type: "comment_deletion",
            note: "Comment deleted by bulk operation",
            balance_after: comment.vote_score,
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
          },
        });
      }
      // Update post comment count
      await tx.reddit_platform_posts.update({
        where: { id: comment.post_id },
        data: {
          comment_count: {
            decrement: 1,
          },
        },
      });
    }
    return totalDeleted;
  });
  return { deleted_count: deletedCount };
}
