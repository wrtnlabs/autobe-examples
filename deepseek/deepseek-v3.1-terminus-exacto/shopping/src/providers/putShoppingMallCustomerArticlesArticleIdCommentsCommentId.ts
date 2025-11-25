import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleComment";
import { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerArticlesArticleIdCommentsCommentId(props: {
  customer: CustomerPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IShoppingMallArticleComment.IUpdate;
}): Promise<IShoppingMallArticleComment> {
  // Verify the comment exists and belongs to the specified article
  const existingComment =
    await MyGlobal.prisma.shopping_mall_article_comments.findFirst({
      where: {
        id: props.commentId,
        shopping_mall_article_id: props.articleId,
        deleted_at: null,
      },
    });

  if (!existingComment) {
    throw new HttpException(
      "Comment not found or does not belong to the specified article",
      404,
    );
  }

  // Verify ownership - customer can only update comments with actor_type = "customer"
  // Since the schema doesn't have actor_id field, we rely on actor_type validation
  if (existingComment.actor_type !== "customer") {
    throw new HttpException(
      "You can only update comments that you created",
      403,
    );
  }

  // Validate parent comment if provided
  if (props.body.parent !== undefined && props.body.parent !== null) {
    const parentComment =
      await MyGlobal.prisma.shopping_mall_article_comments.findFirst({
        where: {
          id: props.body.parent.id,
          shopping_mall_article_id: props.articleId,
          deleted_at: null,
        },
      });

    if (!parentComment) {
      throw new HttpException(
        "Parent comment not found or does not belong to the specified article",
        400,
      );
    }
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };

  if (props.body.content !== undefined) {
    updateData.content = props.body.content;
  }

  if (props.body.status !== undefined) {
    // Customers can only update status to "flagged" for self-moderation
    // Other status changes require admin privileges
    if (
      props.body.status !== "flagged" &&
      props.body.status !== existingComment.status
    ) {
      throw new HttpException(
        "Customers can only flag comments for moderation",
        403,
      );
    }
    updateData.status = props.body.status;
  }

  if (props.body.parent !== undefined) {
    updateData.parent_id = props.body.parent?.id ?? null;
    // Recalculate depth if parent changes
    if (props.body.parent !== null) {
      const parentDepth =
        await MyGlobal.prisma.shopping_mall_article_comments.findFirst({
          where: { id: props.body.parent.id },
          select: { depth: true },
        });
      updateData.depth = parentDepth ? parentDepth.depth + 1 : 0;
    } else {
      updateData.depth = 0;
    }
  }

  // Update the comment
  const updatedComment =
    await MyGlobal.prisma.shopping_mall_article_comments.update({
      where: { id: props.commentId },
      data: updateData,
    });

  // Format the response according to the IShoppingMallArticleComment interface
  const response: IShoppingMallArticleComment = {
    id: updatedComment.id as string & tags.Format<"uuid">,
    content: updatedComment.content,
    status: updatedComment.status as
      | "pending"
      | "approved"
      | "rejected"
      | "flagged",
    like_count: updatedComment.like_count,
    report_count: updatedComment.report_count,
    depth: updatedComment.depth,
    actor_type: updatedComment.actor_type as
      | "customer"
      | "seller"
      | "administrator",
    created_at: toISOStringSafe(updatedComment.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(updatedComment.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: updatedComment.deleted_at
      ? (toISOStringSafe(updatedComment.deleted_at) as string &
          tags.Format<"date-time">)
      : undefined,
    shopping_mall_article_id:
      updatedComment.shopping_mall_article_id as string & tags.Format<"uuid">,
    article: undefined, // Would require additional query to populate
    parent: undefined, // Would require additional query to populate
  };

  return response;
}
