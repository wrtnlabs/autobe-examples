import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEconomicPoliticalBoardAdminArticlesArticleIdCommentsCommentId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.economic_political_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  await MyGlobal.prisma.economic_political_board_comments.findUniqueOrThrow({
    where: {
      id: props.commentId,
      article_id: props.articleId,
    },
  });
  await MyGlobal.prisma.economic_political_board_comments.delete({
    where: { id: props.commentId },
  });
}
