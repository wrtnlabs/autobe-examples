import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEconomicPoliticalBoardMemberArticlesArticleIdCommentsCommentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const comment =
    await MyGlobal.prisma.economic_political_board_comments.findUniqueOrThrow({
      where: { id: props.commentId },
    });
  if (comment.article_id !== props.articleId) {
    throw new HttpException(
      "Comment does not belong to the specified article",
      400,
    );
  }
  if (comment.author_id !== props.member.id) {
    throw new HttpException("You can only delete your own comments", 403);
  }
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment is already deleted", 410);
  }
  await MyGlobal.prisma.economic_political_board_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
