import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticles(props: {
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Build where condition for filtering
  const where: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: null,
    ...(props.body.q && {
      title: { contains: props.body.q },
    }),
    ...(props.body.sectionId && {
      section_id: props.body.sectionId,
    }),
  };
  // Handle tag filtering
  if (props.body.tag) {
    // First get the tag ID by name
    const tagRecord = await MyGlobal.prisma.discussion_board_tags.findFirst({
      where: {
        tag_name: props.body.tag,
      },
      select: { id: true },
    });
    if (!tagRecord) {
      // No articles match this tag
      return {
        pagination: {
          current: page,
          limit,
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
    // Get article IDs associated with this tag
    const tagArticleIds =
      await MyGlobal.prisma.discussion_board_article_tags.findMany({
        where: {
          tag_name: tagRecord.id,
        },
        select: { article_id: true },
      });
    const articleIds = tagArticleIds.map((t) => t.article_id);
    where.id = { in: articleIds };
  }
  // Determine sort order
  const orderBy: Prisma.Enumerable<Prisma.discussion_board_articlesOrderByWithRelationInput> =
    props.body.sortBy === "oldest"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  // Fetch paginated articles with relationships
  const articles = await MyGlobal.prisma.discussion_board_articles.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      title: true,
      content: true,
      created_at: true,
      updated_at: true,
      author: {
        select: {
          id: true,
          email: true,
          display_name: true,
          bio: true,
          is_active: true,
          is_admin: true,
          is_super_admin: true,
          created_at: true,
          updated_at: true,
        },
      },
      section: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
      comments: {
        select: { id: true },
      },
    },
  });
  // Count total articles for pagination
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where,
  });
  // Transform to response format
  const data: IDiscussionBoardArticle.ISummary[] = articles.map((article) => {
    const author: IDiscussionBoardMember.ISummary = {
      id: article.author.id,
      email: article.author.email,
      display_name: article.author.display_name,
      bio: article.author.bio,
      is_active: article.author.is_active,
      is_admin: article.author.is_admin,
      is_super_admin: article.author.is_super_admin,
      created_at: article.author.created_at.toISOString(),
      updated_at: article.author.updated_at.toISOString(),
    };
    const section: IDiscussionBoardSection.ISummary = {
      id: article.section.id as string & tags.Format<"uuid">,
      name: article.section.name,
      description: article.section.description ?? undefined,
    };
    return {
      id: article.id as string & tags.Format<"uuid">,
      title: article.title,
      content: article.content,
      author,
      section,
      commentCount: article.comments.length,
      createdAt: article.created_at.toISOString(),
      updatedAt: article.updated_at.toISOString(),
    };
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
