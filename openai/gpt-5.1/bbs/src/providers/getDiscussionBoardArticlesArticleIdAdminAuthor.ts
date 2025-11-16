import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleOfAdminusersAdminAuthor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleOfAdminusersAdminAuthor";

export async function getDiscussionBoardArticlesArticleIdAdminAuthor(props: {
  articleId: string;
}): Promise<IDiscussionBoardArticleOfAdminusersAdminAuthor> {
  // 1. Ensure the article itself exists.
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: {
      id: props.articleId,
    },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // 2. Look up the admin authorship record for this article.
  const adminAuthorship =
    await MyGlobal.prisma.discussion_board_article_of_adminusers.findUnique({
      where: {
        discussion_board_article_id: props.articleId,
      },
    });

  if (!adminAuthorship) {
    // Article exists but it is not authored by an admin user.
    throw new HttpException("Admin author not found for this article", 404);
  }

  // 3. Fetch the corresponding admin user profile.
  const adminUser =
    await MyGlobal.prisma.discussion_board_adminusers.findUnique({
      where: {
        id: adminAuthorship.discussion_board_adminuser_id,
      },
    });

  if (!adminUser) {
    // Authorship row exists but the referenced admin user record is missing.
    throw new HttpException("Admin author not found for this article", 404);
  }

  // 4. Map to the public-facing DTO. Only expose fields intended for public display.
  const dto: IDiscussionBoardArticleOfAdminusersAdminAuthor = {
    id: adminUser.id,
    displayName: adminUser.display_name,
    roleLabel: adminUser.account_status ?? "Admin",
  };

  return dto;
}
