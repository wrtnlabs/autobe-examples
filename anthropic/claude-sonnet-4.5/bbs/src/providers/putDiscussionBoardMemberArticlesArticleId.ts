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

export async function putDiscussionBoardMemberArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  const existing = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    include: {
      author: true,
      category: true,
    },
  });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }

  if (existing.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }

  const currentTime = toISOStringSafe(new Date());
  const wasPublished = existing.status === "published";
  const willUpdateContent =
    props.body.title !== undefined ||
    props.body.body !== undefined ||
    props.body.slug !== undefined;
  const willPublish =
    props.body.status === "published" && existing.published_at === null;

  const updated = await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.slug !== undefined && { slug: props.body.slug }),
      ...(props.body.body !== undefined && { body: props.body.body }),
      ...(props.body.excerpt !== undefined && { excerpt: props.body.excerpt }),
      ...(props.body.discussion_board_article_category_id !== undefined && {
        discussion_board_article_category_id:
          props.body.discussion_board_article_category_id,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(willPublish && { published_at: currentTime }),
      ...(wasPublished && willUpdateContent && { is_edited: true }),
      updated_at: currentTime,
    },
    include: {
      author: true,
      category: true,
    },
  });

  return {
    id: updated.id,
    title: updated.title,
    slug: updated.slug,
    body: updated.body,
    excerpt: updated.excerpt ?? undefined,
    status: typia.assert<"draft" | "published" | "archived">(updated.status),
    view_count: updated.view_count,
    is_edited: updated.is_edited,
    published_at: updated.published_at
      ? toISOStringSafe(updated.published_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    author: {
      id: updated.author.id,
      username: updated.author.username,
      display_name: updated.author.display_name ?? undefined,
    },
    category: {
      id: updated.category.id,
      name: updated.category.name,
      slug: updated.category.slug,
      description: updated.category.description ?? undefined,
      sort_order: updated.category.sort_order,
      created_at: toISOStringSafe(updated.category.created_at),
      updated_at: toISOStringSafe(updated.category.updated_at),
    },
  };
}
