import { IDiscussionBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentEditHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentEditHistory";
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

export async function patchDiscussionBoardAdminCommentsCommentIdEditHistories(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentEditHistory.IRequest;
}): Promise<IPageIDiscussionBoardCommentEditHistory.ISummary> {
  // Validate comment exists and admin has access
  const comment =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: { id: props.commentId, deleted_at: null },
    });
  // Parse and validate pagination parameters
  const page = Math.max(props.body.page ?? 1, 1);
  const limit = Math.min(Math.max(props.body.limit ?? 100, 1), 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper date handling
  const whereInput: Prisma.discussion_board_comment_edit_historiesWhereInput = {
    discussion_board_comment_id: props.commentId,
    ...(props.body.edit_sequence_min !== undefined && {
      edit_sequence: { gte: props.body.edit_sequence_min },
    }),
    ...(props.body.edit_sequence_max !== undefined && {
      edit_sequence: { lte: props.body.edit_sequence_max },
    }),
    ...(props.body.created_at_min !== undefined && {
      created_at: { gte: new Date(props.body.created_at_min) },
    }),
    ...(props.body.created_at_max !== undefined && {
      created_at: { lte: new Date(props.body.created_at_max) },
    }),
    ...(props.body.search !== undefined &&
      props.body.search.trim() !== "" && {
        OR: [
          {
            original_content: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
          {
            edited_content: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
        ],
      }),
  } satisfies Prisma.discussion_board_comment_edit_historiesWhereInput;
  // Execute parallel queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comment_edit_histories.findMany({
      where: whereInput,
      orderBy: { edit_sequence: "asc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_comment_edit_histories.count({
      where: whereInput,
    }),
  ]);
  // Transform results maintaining ISO string format
  const transformedData: IDiscussionBoardCommentEditHistory.ISummary[] =
    data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      edit_sequence: record.edit_sequence,
      edit_reason: record.edit_reason ?? undefined,
      created_at: record.created_at.toISOString() as string &
        tags.Format<"date-time">,
    }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
