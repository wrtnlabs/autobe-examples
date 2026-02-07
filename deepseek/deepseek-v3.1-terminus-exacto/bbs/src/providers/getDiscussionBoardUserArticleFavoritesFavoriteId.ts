import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFavorite";
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
import { DiscussionBoardArticleFavoriteTransformer } from "../transformers/DiscussionBoardArticleFavoriteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUserArticleFavoritesFavoriteId(props: {
  user: UserPayload;
  favoriteId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleFavorite> {
  const favorite =
    await MyGlobal.prisma.discussion_board_article_favorites.findUnique({
      where: {
        id: props.favoriteId,
        discussion_board_user_id: props.user.id,
      },
      ...DiscussionBoardArticleFavoriteTransformer.select(),
    });
  if (!favorite) {
    throw new HttpException("Favorite record not found", 404);
  }
  return await DiscussionBoardArticleFavoriteTransformer.transform(favorite);
}
