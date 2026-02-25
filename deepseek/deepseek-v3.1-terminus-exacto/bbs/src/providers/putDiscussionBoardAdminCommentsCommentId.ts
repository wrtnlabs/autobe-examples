import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { DiscussionBoardCommentTransformer } from "../transformers/DiscussionBoardCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminCommentsCommentId(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IUpdate;
}): Promise<IDiscussionBoardComment> {
  // Validate request body using typia
  typia.assert(props.body);
  // Validate comment content length
  if (props.body.content.length < 1 || props.body.content.length > 1000) {
    throw new HttpException(
      "Comment content must be between 1 and 1000 characters",
      400,
    );
  }
  const now = new Date();
  // Use transaction for consistency
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Check if comment exists and is not deleted
    await tx.discussion_board_comments.findUniqueOrThrow({
      where: { id: props.commentId, deleted_at: null },
    });
    // Update comment content
    await tx.discussion_board_comments.update({
      where: { id: props.commentId },
      data: {
        content: props.body.content,
        updated_at: now,
      },
    });
    // Fetch updated comment with full relations
    return await tx.discussion_board_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...DiscussionBoardCommentTransformer.select(),
    });
  });
  return await DiscussionBoardCommentTransformer.transform(result);
}
