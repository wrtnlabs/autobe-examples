import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function patchCommunityPlatformAdminCommentsCommentIdSortOrders(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentSortOrder.IRequest;
}): Promise<ICommunityPlatformComment> {
  // Validate comment existence
  const existingComment =
    await MyGlobal.prisma.community_platform_comments.findUnique({
      where: { id: props.commentId },
    });
  if (!existingComment) throw new HttpException("Comment not found", 404);
  // Validate the body object and ensure properties exist
  if (
    typeof props.body !== "object" ||
    props.body === null ||
    typeof (props.body as any).strategy !== "string" ||
    typeof (props.body as any).sort_value !== "number"
  ) {
    throw new HttpException("Invalid sort order entry format", 400);
  }
  const strategy = (props.body as any).strategy as string;
  const sort_value = (props.body as any).sort_value as number;
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Correct the 'where' clause to match Prisma relation filtering syntax
    const existingSortOrder =
      await tx.community_platform_comment_sort_orders.findFirst({
        where: {
          comment: { id: props.commentId },
          strategy: strategy,
        },
      });
    if (existingSortOrder) {
      await tx.community_platform_comment_sort_orders.update({
        where: { id: existingSortOrder.id },
        data: {
          sort_value: sort_value,
          updated_at: now,
        },
      });
    } else {
      await tx.community_platform_comment_sort_orders.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          comment: { connect: { id: props.commentId } },
          strategy: strategy,
          sort_value: sort_value,
          created_at: now,
          updated_at: now,
        },
      });
    }
  });
  // Return the updated comment
  const updatedComment =
    await MyGlobal.prisma.community_platform_comments.findUnique({
      where: { id: props.commentId },
    });
  if (!updatedComment) {
    throw new HttpException(
      "Internal error: Comment missing after update",
      500,
    );
  }
  return updatedComment;
}
