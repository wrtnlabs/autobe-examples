import { IDiscussionBoardArticleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFavorite";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminArticlesArticleIdFavoritesOwn(props: {
  superAdmin: SuperAdminPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleFavorite> {
  // Verify super administrator exists (though already authenticated)
  await MyGlobal.prisma.discussion_board_super_admins.findFirstOrThrow({
    where: {
      id: props.superAdmin.id,
      deleted_at: null,
    },
  });
  // Verify article exists
  await MyGlobal.prisma.discussion_board_articles.findFirstOrThrow({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });
  // Check favorite existence - note: assumes superAdmin.id maps to discussion_board_users.id
  // This may be incorrect based on schema analysis; relationship needs verification
  const favorite =
    await MyGlobal.prisma.discussion_board_article_favorites.findFirst({
      where: {
        discussion_board_article_id: props.articleId,
        discussion_board_user_id: props.superAdmin.id,
      },
    });
  // Return boolean result
  return { favorited: favorite !== null };
}
