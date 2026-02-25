import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentEditHistory";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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
import { DiscussionBoardCommentEditHistoryTransformer } from "../transformers/DiscussionBoardCommentEditHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardUserCommentsCommentIdEditHistories(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentEditHistory.IRequest;
}): Promise<IPageIDiscussionBoardCommentEditHistory> {
  // Verify comment exists (any user can view edit history of any comment)
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: props.commentId,
      deleted_at: null,
    },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  // Parse pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause without Date constructor
  const whereInput = {
    discussion_board_comment_id: props.commentId,
    ...(props.body.edit_sequence_min !== undefined && {
      edit_sequence: { gte: props.body.edit_sequence_min },
    }),
    ...(props.body.edit_sequence_max !== undefined && {
      edit_sequence: { lte: props.body.edit_sequence_max },
    }),
    ...(props.body.search !== undefined && {
      OR: [
        {
          original_content: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
        {
          edited_content: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
    ...(props.body.created_at_min !== undefined && {
      created_at: { gte: props.body.created_at_min }, // Direct string comparison for ISO dates
    }),
    ...(props.body.created_at_max !== undefined && {
      created_at: { lte: props.body.created_at_max }, // Direct string comparison for ISO dates
    }),
  } satisfies Prisma.discussion_board_comment_edit_historiesWhereInput;
  // Execute queries sequentially for better control
  const data =
    await MyGlobal.prisma.discussion_board_comment_edit_histories.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { edit_sequence: "asc" as const },
      ...DiscussionBoardCommentEditHistoryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.discussion_board_comment_edit_histories.count({
      where: whereInput,
    });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardCommentEditHistoryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
