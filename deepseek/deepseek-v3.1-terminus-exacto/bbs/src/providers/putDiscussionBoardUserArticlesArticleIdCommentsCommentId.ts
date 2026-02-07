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
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardCommentTransformer } from "../transformers/DiscussionBoardCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardUserArticlesArticleIdCommentsCommentId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IUpdate;
}): Promise<IDiscussionBoardComment> {
  // Check if comment exists and user has permissions
  const existingComment =
    await MyGlobal.prisma.discussion_board_comments.findFirst({
      where: {
        id: props.commentId,
        discussion_board_article_id: props.articleId,
        discussion_board_user_id: props.user.id,
        deleted_at: null,
      },
    });
  if (!existingComment) {
    throw new HttpException("Comment not found or access denied", 404);
  }
  // Validate update content
  if (props.body.content === undefined) {
    throw new HttpException("Comment content is required for update", 400);
  }
  // Update comment with proper timestamp
  const updatedComment = await MyGlobal.prisma.discussion_board_comments.update(
    {
      where: { id: props.commentId },
      data: {
        content: props.body.content,
        updated_at: toISOStringSafe(new Date()),
      },
      ...DiscussionBoardCommentTransformer.select(),
    },
  );
  return await DiscussionBoardCommentTransformer.transform(updatedComment);
}
