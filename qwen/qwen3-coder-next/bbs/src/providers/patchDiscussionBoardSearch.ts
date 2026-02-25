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

export async function patchDiscussionBoardSearch(props: {
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Build where condition
  const whereInput: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: null,
    ...(props.body.q && {
      OR: [
        { title: { contains: props.body.q, mode: "insensitive" } },
        { content: { contains: props.body.q, mode: "insensitive" } },
      ],
    }),
    ...(props.body.sectionId && {
      section_id: props.body.sectionId as string & tags.Format<"uuid">,
    }),
  };
  // Sort order
  const orderBy =
    props.body.sortBy === "oldest"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const };
  // Fetch paginated data with author and section relations
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      title: true,
      content: true,
      author_id: true,
      section_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
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
    },
  });
  // Count total for pagination
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereInput,
  });
  // Transform data with proper date formatting and type safety
  const transformed = data.map(
    (article) =>
      ({
        id: article.id as string & tags.Format<"uuid">,
        title: article.title,
        content: article.content,
        author: {
          id: article.author.id as string & tags.Format<"uuid">,
          email: article.author.email as string & tags.Format<"email">,
          display_name: article.author.display_name,
          bio: article.author.bio ? toISOStringSafe(article.author.bio) : null,
          is_active: article.author.is_active,
          is_admin: article.author.is_admin,
          is_super_admin: article.author.is_super_admin,
          created_at: toISOStringSafe(article.author.created_at) as string &
            tags.Format<"date-time">,
          updated_at: toISOStringSafe(article.author.updated_at) as string &
            tags.Format<"date-time">,
        } satisfies IDiscussionBoardMember.ISummary,
        section: {
          id: article.section.id as string & tags.Format<"uuid">,
          name: article.section.name,
          description: article.section.description
            ? toISOStringSafe(article.section.description)
            : null,
        } satisfies IDiscussionBoardSection.ISummary,
        commentCount: 0,
        createdAt: toISOStringSafe(article.created_at) as string &
          tags.Format<"date-time">,
        updatedAt: toISOStringSafe(article.updated_at) as string &
          tags.Format<"date-time">,
      }) satisfies IDiscussionBoardArticle.ISummary,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit) || 0,
    } satisfies IPage.IPagination,
    data: transformed,
  };
}
