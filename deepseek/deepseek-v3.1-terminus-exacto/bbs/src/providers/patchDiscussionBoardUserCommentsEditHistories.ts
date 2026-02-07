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
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardUserCommentsEditHistories(props: {
  user: UserPayload;
  body: IDiscussionBoardCommentEditHistory.IRequest;
}): Promise<IPageIDiscussionBoardCommentEditHistory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100); // Maximum limit of 100
  const skip = (page - 1) * limit;
  // Build where clause with filters - ensure user can only access their own comment edit histories
  const whereInput: Prisma.discussion_board_comment_edit_historiesWhereInput = {
    comment: {
      discussion_board_user_id: props.user.id,
      deleted_at: null,
    },
    ...(props.body.edit_sequence_min !== undefined && {
      edit_sequence: { gte: props.body.edit_sequence_min },
    }),
    ...(props.body.edit_sequence_max !== undefined && {
      edit_sequence: { lte: props.body.edit_sequence_max },
    }),
    ...(props.body.content_search !== undefined &&
      props.body.content_search.trim() !== "" && {
        OR: [
          {
            original_content: {
              contains: props.body.content_search,
              mode: "insensitive" as const,
            },
          },
          {
            edited_content: {
              contains: props.body.content_search,
              mode: "insensitive" as const,
            },
          },
        ],
      }),
    ...(props.body.created_at_start !== undefined && {
      created_at: { gte: props.body.created_at_start },
    }),
    ...(props.body.created_at_end !== undefined && {
      created_at: { lte: props.body.created_at_end },
    }),
  };
  // Execute queries sequentially for better error handling
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comment_edit_histories.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      select: {
        id: true,
        edit_sequence: true,
        edit_reason: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_comment_edit_histories.count({
      where: whereInput,
    }),
  ]);
  // Transform database records to DTO format with proper type handling
  const transformedData: IDiscussionBoardCommentEditHistory.ISummary[] =
    data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      edit_sequence: record.edit_sequence,
      edit_reason: record.edit_reason === null ? undefined : record.edit_reason,
      created_at: toISOStringSafe(record.created_at),
    }));
  // Calculate pagination metadata
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    pagination,
    data: transformedData,
  };
}
