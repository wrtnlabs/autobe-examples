import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import { IPageIDiscussionBoardEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardEditHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEditHistory";

export async function patchDiscussionBoardTopicsTopicIdEditHistory(props: {
  topicId: string & tags.Format<"uuid">;
  body: IDiscussionBoardTopic.IEditHistoryRequest;
}): Promise<IPageIDiscussionBoardEditHistory> {
  const { topicId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereClause = {
    entity_type: "topic",
    entity_id: topicId,
    deleted_at: null,
    ...((body.start_date !== undefined && body.start_date !== null) ||
    (body.end_date !== undefined && body.end_date !== null)
      ? {
          created_at: {
            ...(body.start_date !== undefined &&
              body.start_date !== null && {
                gte: body.start_date,
              }),
            ...(body.end_date !== undefined &&
              body.end_date !== null && {
                lte: body.end_date,
              }),
          },
        }
      : {}),
    ...(body.editor_member_id !== undefined &&
      body.editor_member_id !== null && {
        discussion_board_member_id: body.editor_member_id,
      }),
  };

  const [editRecords, totalCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_edit_history.findMany({
      where: whereClause,
      orderBy:
        body.sort_by === "created_at_asc"
          ? { created_at: "asc" }
          : { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_edit_history.count({
      where: whereClause,
    }),
  ]);

  const data = editRecords.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    discussion_board_member_id: record.discussion_board_member_id as string &
      tags.Format<"uuid">,
    entity_type: record.entity_type,
    entity_id: record.entity_id as string & tags.Format<"uuid">,
    previous_content: record.previous_content,
    new_content: record.new_content,
    edit_reason: record.edit_reason ?? null,
    created_at: toISOStringSafe(record.created_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  }));

  const totalPages = Math.ceil(totalCount / limit);

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
