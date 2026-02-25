import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardUserArticlesArticleIdFavorites(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Delete the favorite relationship using the composite unique key
  await MyGlobal.prisma.discussion_board_article_favorites.delete({
    where: {
      discussion_board_user_id_discussion_board_article_id: {
        discussion_board_user_id: props.user.id,
        discussion_board_article_id: props.articleId,
      },
    },
  });
}
