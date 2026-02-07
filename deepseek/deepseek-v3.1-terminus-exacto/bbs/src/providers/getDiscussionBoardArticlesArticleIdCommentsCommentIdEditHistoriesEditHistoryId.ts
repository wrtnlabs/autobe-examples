import { IDiscussionBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentEditHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardCommentEditHistoryTransformer } from "../transformers/DiscussionBoardCommentEditHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticlesArticleIdCommentsCommentIdEditHistoriesEditHistoryId(props: {
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  editHistoryId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCommentEditHistory> {
  // First verify that the comment belongs to the specified article
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: {
      id: props.commentId,
      article: {
        id: props.articleId,
      },
    },
  });
  if (!comment) {
    throw new HttpException(
      "Comment not found or does not belong to the specified article",
      404,
    );
  }
  // Then retrieve the specific edit history entry
  const editHistory =
    await MyGlobal.prisma.discussion_board_comment_edit_histories.findUnique({
      where: {
        id: props.editHistoryId,
        discussion_board_comment_id: props.commentId,
      },
      ...DiscussionBoardCommentEditHistoryTransformer.select(),
    });
  if (!editHistory) {
    throw new HttpException("Edit history entry not found", 404);
  }
  return await DiscussionBoardCommentEditHistoryTransformer.transform(
    editHistory,
  );
}
