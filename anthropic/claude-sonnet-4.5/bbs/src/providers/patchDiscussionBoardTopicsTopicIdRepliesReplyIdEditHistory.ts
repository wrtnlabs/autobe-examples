import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import { IPageIDiscussionBoardEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardEditHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEditHistory";

export async function patchDiscussionBoardTopicsTopicIdRepliesReplyIdEditHistory(props: {
  topicId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
  body: IDiscussionBoardReply.IEditHistoryRequest;
}): Promise<IPageIDiscussionBoardEditHistory> {
  const { topicId, replyId, body } = props;

  // Validate topic exists and is not deleted
  const topic = await MyGlobal.prisma.discussion_board_topics.findFirst({
    where: {
      id: topicId,
      deleted_at: null,
    },
  });

  if (!topic) {
    throw new HttpException("Topic not found or has been deleted", 404);
  }

  // Validate reply exists, belongs to topic, and is not deleted
  const reply = await MyGlobal.prisma.discussion_board_replies.findFirst({
    where: {
      id: replyId,
      discussion_board_topic_id: topicId,
      deleted_at: null,
    },
  });

  if (!reply) {
    throw new HttpException(
      "Reply not found, does not belong to this topic, or has been deleted",
      404,
    );
  }

  // Build date range filter
  const hasStartDate =
    body.start_date !== undefined && body.start_date !== null;
  const hasEndDate = body.end_date !== undefined && body.end_date !== null;

  // Build where clause for edit history
  const where = {
    entity_type: "reply",
    entity_id: replyId,
    deleted_at: null,
    ...(body.editor_member_id !== undefined &&
      body.editor_member_id !== null && {
        discussion_board_member_id: body.editor_member_id,
      }),
    ...((hasStartDate || hasEndDate) && {
      created_at: {
        ...(hasStartDate && { gte: body.start_date }),
        ...(hasEndDate && { lte: body.end_date }),
      },
    }),
  };

  // Determine sort order
  const sortBy = body.sort_by ?? "created_at_desc";
  const orderBy =
    sortBy === "created_at_asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const };

  // Calculate pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Execute queries in parallel
  const [editRecords, totalCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_edit_history.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.discussion_board_edit_history.count({
      where,
    }),
  ]);

  // Transform to response format
  const data = editRecords.map((record) => ({
    id: record.id,
    discussion_board_member_id: record.discussion_board_member_id,
    entity_type: record.entity_type,
    entity_id: record.entity_id,
    previous_content: record.previous_content,
    new_content: record.new_content,
    edit_reason: record.edit_reason ?? null,
    created_at: toISOStringSafe(record.created_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  }));

  // Build pagination response
  const totalPages = Math.ceil(totalCount / take);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: totalCount,
      pages: totalPages,
    },
    data,
  };
}
