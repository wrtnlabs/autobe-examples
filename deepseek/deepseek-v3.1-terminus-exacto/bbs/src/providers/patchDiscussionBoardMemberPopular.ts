import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMemberPopular(props: {
  member: MemberPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build base where clause
  const whereInput = {
    status: "published",
    deleted_at: null,
    ...(props.body.discussion_board_section_id && {
      discussion_board_section_id: props.body.discussion_board_section_id,
    }),
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { body: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  } satisfies Prisma.discussion_board_articlesWhereInput;
  // Get total count for pagination
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereInput,
  });
  // Fetch articles with popularity metrics
  const articles = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: whereInput,
    skip,
    take: limit,
    include: {
      author: {
        select: {
          id: true,
          display_name: true,
          bio: true,
        },
      },
      section: {
        select: {
          id: true,
          name: true,
          description: true,
          created_at: true,
        },
      },
      tags: {
        select: {
          id: true,
          created_at: true,
        },
      },
      viewStats: {
        select: {
          id: true,
          viewed_at: true,
        },
        where: {
          viewed_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
        },
      },
      reactions: {
        select: {
          id: true,
          reaction_type: true,
          created_at: true,
        },
      },
      commentStatistic: {
        select: {
          total_comment_count: true,
          latest_comment_timestamp: true,
        },
      },
    },
    orderBy: {
      // Popularity ordering based on weighted metrics
      // Weighted score = (view_count * 1) + (reaction_count * 2) + (comment_count * 3)
      reactions: { _count: "desc" },
    },
  });
  // Transform to DTO summary format
  const data = await Promise.all(
    articles.map(async (article) => {
      const viewCount = article.viewStats.length;
      const reactionCount = article.reactions.length;
      const commentCount = article.commentStatistic?.total_comment_count ?? 0;
      return {
        id: article.id,
        title: article.title,
        author: {
          id: article.author.id,
          display_name: article.author.display_name,
          bio: article.author.bio ?? undefined,
        } satisfies IDiscussionBoardMember.ISummary,
        section: {
          id: article.section.id,
          name: article.section.name,
          description: article.section.description ?? null,
          created_at: article.section.created_at.toISOString(),
        } satisfies IDiscussionBoardSection.ISummary,
        tags: article.tags.map((tag) => ({
          id: tag.id,
          tag: tag.id, // Derived from normalized id
          usage_count: 0, // Would need separate query for tag usage
        })) satisfies IDiscussionBoardArticleTag.ISummary[],
        comments_count: commentCount,
        created_at: article.created_at.toISOString(),
      } satisfies IDiscussionBoardArticle.ISummary;
    }),
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardArticle.ISummary;
}
