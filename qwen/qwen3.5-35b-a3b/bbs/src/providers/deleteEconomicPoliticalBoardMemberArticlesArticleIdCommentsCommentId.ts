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
  // 1. Verify article exists
  await MyGlobal.prisma.economic_political_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // 2. Verify comment exists and belongs to the article
  const comment =
    await MyGlobal.prisma.economic_political_board_comments.findUniqueOrThrow({
      where: { id: props.commentId },
    });
  // Verify comment belongs to the specified article
  if (comment.article_id !== props.articleId) {
    throw new HttpException(
      "Comment does not belong to the specified article",
      404,
    );
  }
  // 3. Check authorization: owner or admin
  const isAdmin =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findFirst(
      {
        where: { id: props.member.id },
      },
    );
  if (comment.author_id !== props.member.id && !isAdmin) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Delete the comment (cascade handles dependent records)
  await MyGlobal.prisma.economic_political_board_comments.delete({
    where: { id: props.commentId },
  });
}
