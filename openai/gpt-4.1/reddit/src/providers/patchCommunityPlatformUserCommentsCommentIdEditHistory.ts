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

export async function patchCommunityPlatformUserCommentsCommentIdEditHistory(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentEditHistory.IRequest;
}): Promise<IPageICommunityPlatformCommentEditHistory> {
  const {
    page = 1,
    limit = 100,
    sort = "created_at_desc",
    fromDate,
    toDate,
  } = props.body || {};

  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    comment_id: props.commentId,
    ...(fromDate && {
      created_at: {
        ...(fromDate && { gte: fromDate }),
        ...(toDate && { lte: toDate }),
      },
    }),
  };

  // Sorting logic: created_at_asc or created_at_desc
  const orderBy = {
    created_at:
      sort === "created_at_asc" ? Prisma.SortOrder.asc : Prisma.SortOrder.desc,
  };

  const [records, total] = await Promise.all([
    MyGlobal.prisma.community_platform_comment_edit_history.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_comment_edit_history.count({ where }),
  ]);

  const data = records.map((row) => ({
    id: row.id,
    comment_id: row.comment_id,
    snapshot_id: row.snapshot_id,
    user_session_id: row.user_session_id,
    edit_reason:
      typeof row.edit_reason === "undefined"
        ? undefined
        : row.edit_reason === null
          ? null
          : row.edit_reason,
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
