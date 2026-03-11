import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

export async function patchDiscussionBoardSectionsSectionIdArticles(props: {
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  // Validate section exists and is not soft-deleted
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: { id: props.sectionId, deleted_at: null },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where conditions
  const whereInput: Prisma.discussion_board_articlesWhereInput = {
    discussion_board_section_id: props.sectionId,
    deleted_at: props.body.deleted === true ? undefined : null,
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search } },
        { body: { contains: props.body.search } },
      ],
    }),
    ...(props.body.memberId && {
      discussion_board_member_id: props.body.memberId,
    }),
    ...(props.body.createdAtGte && {
      created_at: { gte: props.body.createdAtGte },
    }),
    ...(props.body.createdAtLte && {
      created_at: { lte: props.body.createdAtLte },
    }),
    ...(props.body.tagIds &&
      props.body.tagIds.length > 0 && {
        article_tags: {
          some: {
            discussion_board_tag_id: {
              in: props.body.tagIds,
            },
          },
        },
      }),
  };
  // Build orderBy conditions
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.discussion_board_articlesOrderByWithRelationInput =
    sortBy === "title" ? { title: sortOrder } : { created_at: sortOrder };
  // Fetch articles with relations
  const articles = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      title: true,
      discussion_board_section_id: true,
      discussion_board_member_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      section: {
        select: {
          id: true,
          name: true,
          description: true,
          discussion_board_admin_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          creator: {
            select: {
              id: true,
              display_name: true,
              bio: true,
              grade: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
      member: {
        select: {
          id: true,
          display_name: true,
          ban_status: true,
          created_at: true,
        },
      },
      comments: {
        select: {
          id: true,
        },
        where: {
          deleted_at: null,
        },
      },
    },
  });
  // Count total articles
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereInput,
  });
  // Transform to summaries
  const data = await ArrayUtil.asyncMap(articles, async (article) => {
    const sectionSummary: IDiscussionBoardSection.ISummary = {
      id: article.section.id,
      name: article.section.name,
      description: article.section.description ?? null,
      creator: {
        id: article.section.creator.id,
        display_name: article.section.creator.display_name,
        bio: article.section.creator.bio ?? null,
        grade: article.section.creator.grade,
        created_at: article.section.creator.created_at.toISOString(),
        updated_at: article.section.creator.updated_at.toISOString(),
        deleted_at: article.section.creator.deleted_at?.toISOString() ?? null,
      } satisfies IDiscussionBoardAdmin.ISummary,
      created_at: article.section.created_at.toISOString(),
      updated_at: article.section.updated_at.toISOString(),
      deleted_at: article.section.deleted_at?.toISOString() ?? null,
    } satisfies IDiscussionBoardSection.ISummary;
    const authorSummary: IDiscussionBoardMember.ISummary = {
      id: article.member.id,
      display_name: article.member.display_name,
      ban_status: article.member.ban_status,
      created_at: article.member.created_at.toISOString(),
    } satisfies IDiscussionBoardMember.ISummary;
    return {
      id: article.id,
      title: article.title,
      section: sectionSummary,
      author: authorSummary,
      created_at: article.created_at.toISOString(),
      updated_at: article.updated_at.toISOString(),
      deleted_at: article.deleted_at?.toISOString() ?? null,
      comments_count: article.comments.length,
    } satisfies IDiscussionBoardArticle.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  } satisfies IPageIDiscussionBoardArticle.ISummary;
}
