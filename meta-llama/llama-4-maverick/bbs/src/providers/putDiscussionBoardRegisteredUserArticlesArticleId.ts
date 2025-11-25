import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function putDiscussionBoardRegisteredUserArticlesArticleId(props: {
  registeredUser: RegisteredUserPayload;
  articleId: string;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<string> {
  const existingArticle =
    await MyGlobal.prisma.discussion_board_articles.findFirst({
      where: { id: props.articleId, deleted_at: null },
    });
  if (!existingArticle) {
    throw new HttpException("Article not found", 404);
  }
  const updatedArticle = await MyGlobal.prisma.discussion_board_articles.update(
    {
      where: { id: props.articleId },
      data: {
        title: props.body,
        content: props.body,
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );
  return updatedArticle.id;
}
