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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminCommentsCommentIdEditHistories(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentEditHistory.IRequest;
}): Promise<IPageICommunityPlatformCommentEditHistory> {
  const { commentId, body } = props;

  // Pagination defaults
  const page = body.page ?? 0;
  const limit = body.limit ?? 20;
  const orderBy =
    body.order_by === "asc" || body.order_by === "desc"
      ? body.order_by
      : "desc";
  const skip = page * limit;

  // Fetch total count for pagination
  const total =
    await MyGlobal.prisma.community_platform_comment_edit_histories.count({
      where: { comment_id: commentId },
    });

  // Fetch paginated, sorted edit histories
  const rows =
    await MyGlobal.prisma.community_platform_comment_edit_histories.findMany({
      where: { comment_id: commentId },
      orderBy: { created_at: orderBy },
      skip,
      take: limit,
    });

  // Map to DTO structure
  const data = rows.map((row) => ({
    id: row.id,
    comment_id: row.comment_id,
    editor_user_id: row.editor_user_id,
    editor_user_session_id: row.editor_user_session_id,
    prior_body: row.prior_body,
    edit_reason: row.edit_reason ?? undefined,
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / (limit === 0 ? 1 : limit)),
    },
    data,
  };
}
