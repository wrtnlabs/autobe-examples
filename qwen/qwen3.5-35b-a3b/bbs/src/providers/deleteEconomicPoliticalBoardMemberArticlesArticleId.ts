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

export async function deleteEconomicPoliticalBoardMemberArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const article =
    await MyGlobal.prisma.economic_political_board_articles.findUnique({
      where: { id: props.articleId },
      select: {
        id: true,
        author_id: true,
        deleted_at: true,
      },
    });
  if (article === null) {
    throw new HttpException("Article not found", 404);
  }
  if (article.deleted_at !== null) {
    throw new HttpException("Article has already been deleted", 409);
  }
  if (article.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.economic_political_board_articles.delete({
    where: { id: props.articleId },
  });
}
