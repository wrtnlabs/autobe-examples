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

export async function patchDiscussionBoardMemberEngagement(props: {
  member: MemberPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause for filtering
  const whereInput = {
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
  // Get articles with engagement metrics in a single query
  const articles = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      created_at: true,
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
        },
      },
      reactions: {
        select: {
          reaction_type: true,
        },
      },
      viewStats: {
        select: {
          id: true,
        },
      },
      commentStatistic: {
        select: {
          total_comment_count: true,
        },
      },
    },
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereInput,
  });
  // Transform to DTO format
  const data = articles.map((article) => {
    // Count reactions by type
    const reactionCounts = article.reactions.reduce(
      (acc, reaction) => {
        acc[reaction.reaction_type] = (acc[reaction.reaction_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    // Get unique tags with usage counts
    const tagUsageMap = article.tags.reduce(
      (acc, tag) => {
        acc[tag.id] = (acc[tag.id] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const tags = Object.entries(tagUsageMap).map(
      ([tagId, usageCount]) =>
        ({
          id: tagId as string & tags.Format<"uuid">,
          tag: tagId, // Using id as tag text since schema stores tag text in id field
          usage_count: usageCount,
        }) satisfies IDiscussionBoardArticleTag.ISummary,
    );
    return {
      id: article.id as string & tags.Format<"uuid">,
      title: article.title,
      author: {
        id: article.author.id as string & tags.Format<"uuid">,
        display_name: article.author.display_name,
        bio: article.author.bio,
      } satisfies IDiscussionBoardMember.ISummary,
      section: {
        id: article.section.id as string & tags.Format<"uuid">,
        name: article.section.name,
        description: article.section.description,
        created_at: article.section.created_at.toISOString() as string &
          tags.Format<"date-time">,
      } satisfies IDiscussionBoardSection.ISummary,
      tags,
      comments_count: article.commentStatistic?.total_comment_count ?? 0,
      created_at: article.created_at.toISOString() as string &
        tags.Format<"date-time">,
    } satisfies IDiscussionBoardArticle.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIDiscussionBoardArticle.ISummary;
}
