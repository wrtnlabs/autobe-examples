import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentEditHistory";
import { IPageICommunityPlatformCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentEditHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchCommunityPlatformUserCommentsCommentIdEditHistories(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentEditHistory.IRequest;
}): Promise<IPageICommunityPlatformCommentEditHistory> {
  // 1. Validate comment existence & access rights
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  if (comment.user_id !== props.user.id)
    throw new HttpException(
      "Not authorized to view the edit history for this comment",
      403,
    );

  // 2. Pagination arguments
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const order: "asc" | "desc" = props.body.order_by === "desc" ? "desc" : "asc";
  const skip = (Number(page) - 1) * Number(limit);

  // 3. Count total histories
  const total =
    await MyGlobal.prisma.community_platform_comment_edit_histories.count({
      where: { comment_id: props.commentId },
    });

  // 4. Fetch paginated histories
  const rows =
    await MyGlobal.prisma.community_platform_comment_edit_histories.findMany({
      where: { comment_id: props.commentId },
      orderBy: { created_at: order },
      skip: skip,
      take: Number(limit),
    });
  const data = rows.map((hist) => ({
    id: hist.id,
    comment_id: hist.comment_id,
    editor_user_id: hist.editor_user_id,
    editor_user_session_id: hist.editor_user_session_id,
    prior_body: hist.prior_body,
    edit_reason: hist.edit_reason === null ? undefined : hist.edit_reason,
    created_at: toISOStringSafe(hist.created_at),
  }));

  // 5. Return page format
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
