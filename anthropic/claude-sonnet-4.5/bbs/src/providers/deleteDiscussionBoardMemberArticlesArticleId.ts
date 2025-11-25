import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticle> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    include: {
      author: true,
      category: true,
    },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  if (article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }

  if (article.discussion_board_member_id !== props.member.id) {
    throw new HttpException("You can only delete your own articles", 403);
  }

  const now = new Date();

  const [, deletedArticle] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.discussion_board_article_attachments.updateMany({
      where: {
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    }),
    MyGlobal.prisma.discussion_board_articles.update({
      where: { id: props.articleId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
      include: {
        author: true,
        category: true,
      },
    }),
  ]);

  return {
    id: deletedArticle.id as string & tags.Format<"uuid">,
    title: deletedArticle.title,
    slug: deletedArticle.slug,
    body: deletedArticle.body,
    excerpt:
      deletedArticle.excerpt === null ? undefined : deletedArticle.excerpt,
    status: deletedArticle.status as "draft" | "published" | "archived",
    view_count: deletedArticle.view_count,
    is_edited: deletedArticle.is_edited,
    published_at:
      deletedArticle.published_at === null
        ? undefined
        : toISOStringSafe(deletedArticle.published_at),
    created_at: toISOStringSafe(deletedArticle.created_at),
    updated_at: toISOStringSafe(deletedArticle.updated_at),
    deleted_at:
      deletedArticle.deleted_at === null
        ? undefined
        : toISOStringSafe(deletedArticle.deleted_at),
    author: {
      id: deletedArticle.author.id as string & tags.Format<"uuid">,
      username: deletedArticle.author.username,
      display_name:
        deletedArticle.author.display_name === null
          ? undefined
          : deletedArticle.author.display_name,
    },
    category: {
      id: deletedArticle.category.id as string & tags.Format<"uuid">,
      name: deletedArticle.category.name,
      slug: deletedArticle.category.slug,
      description:
        deletedArticle.category.description === null
          ? undefined
          : deletedArticle.category.description,
      sort_order: deletedArticle.category.sort_order,
      created_at: toISOStringSafe(deletedArticle.category.created_at),
      updated_at: toISOStringSafe(deletedArticle.category.updated_at),
    },
  };
}
