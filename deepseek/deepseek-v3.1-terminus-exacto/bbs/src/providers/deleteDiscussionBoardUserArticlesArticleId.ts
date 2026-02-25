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
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Query article with author relation
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
    include: {
      author: {
        select: {
          id: true,
        },
      },
    },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Check if user is the article author
  const isAuthor = article.author.id === props.user.id;
  if (isAuthor) {
    // Author can delete their own articles
    const timestamp = new Date().toISOString();
    await MyGlobal.prisma.discussion_board_articles.update({
      where: { id: props.articleId },
      data: { deleted_at: timestamp },
    });
    return;
  }
  // Check admin privileges (regular admin or super admin)
  const [admin, superAdmin] = await Promise.all([
    MyGlobal.prisma.discussion_board_admins.findFirst({
      where: {
        id: props.user.id,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.discussion_board_super_admins.findFirst({
      where: {
        id: props.user.id,
        deleted_at: null,
      },
    }),
  ]);
  const isAdmin = !!admin || !!superAdmin;
  if (!isAdmin) {
    throw new HttpException("Unauthorized to delete this article", 403);
  }
  // Admin can delete any article
  const timestamp = new Date().toISOString();
  await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: { deleted_at: timestamp },
  });
}
