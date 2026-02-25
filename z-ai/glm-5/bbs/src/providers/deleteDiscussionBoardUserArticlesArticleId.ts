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

export async function deleteDiscussionBoardUserArticlesArticleId(props: {
  user: UserPayload;
  articleId: string;
}): Promise<void> {
  // Find the article
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: {
        id: true,
        discussion_board_user_id: true,
        deleted_at: true,
      },
    });
  // Get user info for permission check
  const dbUser = await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow(
    {
      where: { id: props.user.id },
      select: {
        permission_level: true,
        is_banned: true,
      },
    },
  );
  // Authorization check
  const isAuthor = article.discussion_board_user_id === props.user.id;
  const isAdmin =
    dbUser.permission_level === "ADMINISTRATOR" ||
    dbUser.permission_level === "SUPER_ADMINISTRATOR";
  if (isAuthor) {
    // Author cannot delete if banned
    if (dbUser.is_banned) {
      throw new HttpException(
        "Forbidden: banned users cannot delete articles",
        403,
      );
    }
  } else if (!isAdmin) {
    // Not author and not admin
    throw new HttpException(
      "Forbidden: you can only delete your own articles",
      403,
    );
  }
  // Delete the article (cascade handles comments, files, images, tags)
  await MyGlobal.prisma.discussion_board_articles.delete({
    where: { id: props.articleId },
  });
}
