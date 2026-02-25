import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentEditHistory";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardCommentEditHistoryTransformer } from "../transformers/DiscussionBoardCommentEditHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminCommentsCommentIdEditHistoriesEditHistoryId(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  editHistoryId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCommentEditHistory> {
  // Find the specific edit history record that belongs to the specified comment
  const editHistory =
    await MyGlobal.prisma.discussion_board_comment_edit_histories.findUniqueOrThrow(
      {
        where: {
          id: props.editHistoryId,
          discussion_board_comment_id: props.commentId,
        },
        ...DiscussionBoardCommentEditHistoryTransformer.select(),
      },
    );
  // Transform the database result to the API response DTO
  return await DiscussionBoardCommentEditHistoryTransformer.transform(
    editHistory,
  );
}
