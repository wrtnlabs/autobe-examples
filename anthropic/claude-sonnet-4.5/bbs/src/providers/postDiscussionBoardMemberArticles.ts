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

export async function postDiscussionBoardMemberArticles(props: {
  member: MemberPayload;
  body: IDiscussionBoardArticle.ICreate;
}): Promise<IDiscussionBoardArticle> {
  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const generateExcerpt = (body: string): string => {
    const plainText = body.replace(/<[^>]*>/g, "").trim();
    return plainText.length > 200
      ? plainText.substring(0, 200) + "..."
      : plainText;
  };

  const category =
    await MyGlobal.prisma.discussion_board_article_categories.findUnique({
      where: { id: props.body.discussion_board_article_category_id },
    });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  let slug = generateSlug(props.body.title);
  let slugCounter = 1;

  while (true) {
    const existing = await MyGlobal.prisma.discussion_board_articles.findFirst({
      where: { slug },
    });

    if (!existing) break;

    slug = `${generateSlug(props.body.title)}-${slugCounter}`;
    slugCounter++;
  }

  const now = new Date();
  const articleId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.discussion_board_articles.create({
    data: {
      id: articleId,
      title: props.body.title,
      slug,
      body: props.body.body,
      excerpt: generateExcerpt(props.body.body),
      status: props.body.status,
      view_count: 0,
      is_edited: false,
      published_at: props.body.status === "published" ? now : null,
      discussion_board_article_category_id:
        props.body.discussion_board_article_category_id,
      discussion_board_member_id: props.member.id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    include: {
      author: true,
      category: true,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    title: created.title,
    slug: created.slug,
    body: created.body,
    excerpt: created.excerpt === null ? undefined : created.excerpt,
    status: created.status as "draft" | "published" | "archived",
    view_count: created.view_count,
    is_edited: created.is_edited,
    published_at: created.published_at
      ? toISOStringSafe(created.published_at)
      : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
    author: {
      id: created.author.id as string & tags.Format<"uuid">,
      username: created.author.username,
      display_name:
        created.author.display_name === null
          ? undefined
          : created.author.display_name,
    },
    category: {
      id: created.category.id as string & tags.Format<"uuid">,
      name: created.category.name,
      slug: created.category.slug,
      description:
        created.category.description === null
          ? undefined
          : created.category.description,
      sort_order: created.category.sort_order,
      created_at: toISOStringSafe(created.category.created_at),
      updated_at: toISOStringSafe(created.category.updated_at),
    },
  };
}
