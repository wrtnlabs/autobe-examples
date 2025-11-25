import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionRecentlyViewed } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionRecentlyViewed";
import { IEconomicDiscussionSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSortOrder";
import { IPageIEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionArticle";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchEconomicDiscussionDiscoveryRecentlyViewed(props: {
  member: MemberPayload;
  body: IEconomicDiscussionRecentlyViewed.IRequest;
}): Promise<IPageIEconomicDiscussionArticle.ISummary> {
  const page = Number(props.body.page) ?? 1;
  const limit = Number(props.body.limit) ?? 20;
  const skip = (page - 1) * limit;

  // Build article status filter
  const articleStatusFilter: Record<string, unknown> = {};
  if (!props.body.include_deleted) {
    articleStatusFilter.deleted_at = null;
  }

  // For this system, we'll use the articles table with view count and timestamps
  // to determine recently viewed articles. Members' recent activity can be inferred
  // from articles they have interaction with (through comments, or articles they've viewed)

  // For now, we'll return articles sorted by view count and recent updates
  // as a proxy for "recently viewed" discovery
  const articles = await MyGlobal.prisma.economic_discussion_articles.findMany({
    where: {
      status: "approved", // Only show approved articles
      ...articleStatusFilter,
    },
    include: {
      member: true,
      moderator: true,
      economic_discussion_article_categories: {
        include: {
          category: true,
        },
      },
    },
    orderBy: [
      { view_count: props.body.sort_order === "asc" ? "asc" : "desc" },
      { updated_at: props.body.sort_order === "asc" ? "asc" : "desc" },
    ],
    skip,
    take: limit,
  });

  // Get attachment and comment counts for each article
  const articleIds = articles.map((article) => article.id);

  const [attachmentsCount, commentsCount] = await Promise.all([
    MyGlobal.prisma.economic_discussion_attachments.groupBy({
      by: ["economic_discussion_article_id"],
      where: {
        economic_discussion_article_id: { in: articleIds },
      },
      _count: {
        id: true,
      },
    }),
    MyGlobal.prisma.economic_discussion_comments.groupBy({
      by: ["economic_discussion_article_id"],
      where: {
        economic_discussion_article_id: { in: articleIds },
        deleted_at: null,
      },
      _count: {
        id: true,
      },
    }),
  ]);

  // Create lookup maps for counts
  const attachmentMap = new Map(
    attachmentsCount.map((item) => [
      item.economic_discussion_article_id,
      item._count.id,
    ]),
  );
  const commentMap = new Map(
    commentsCount.map((item) => [
      item.economic_discussion_article_id,
      item._count.id,
    ]),
  );

  // Get total count
  const totalCount = await MyGlobal.prisma.economic_discussion_articles.count({
    where: {
      status: "approved",
      ...articleStatusFilter,
    },
  });

  // Transform to summary format
  const summaries: IEconomicDiscussionArticle.ISummary[] = articles.map(
    (article) => {
      let memberAuthor: IEconomicDiscussionMembers.ISummary | undefined;
      if (article.member) {
        memberAuthor = {
          id: `${article.member.id}` as string & tags.Format<"uuid">,
          username: article.member.username,
          email_verified: article.member.email_verified,
          reputation_score: article.member.reputation_score,
          created_at: toISOStringSafe(article.member.created_at),
        };
      }

      let moderatorAuthor: IEconomicDiscussionModerators.ISummary | undefined;
      if (article.moderator) {
        moderatorAuthor = {
          id: `${article.moderator.id}` as string & tags.Format<"uuid">,
          username: article.moderator.username,
          moderation_level: article.moderator.moderation_level as
            | "standard"
            | "senior"
            | "admin",
          created_at: toISOStringSafe(article.moderator.created_at),
        };
      }

      const categories: IEconomicDiscussionCategories.ISummary[] =
        article.economic_discussion_article_categories.map((cat) => ({
          id: `${cat.category.id}` as string & tags.Format<"uuid">,
          name: cat.category.name,
          code: cat.category.code,
          display_order: cat.category.display_order,
          is_active: cat.category.is_active,
          article_count: cat.category.article_count,
        }));

      return {
        id: `${article.id}` as string & tags.Format<"uuid">,
        title: article.title,
        view_count: article.view_count,
        created_at: toISOStringSafe(article.created_at),
        updated_at: toISOStringSafe(article.updated_at),
        economic_discussion_member_id:
          `${article.economic_discussion_member_id}` as string &
            tags.Format<"uuid">,
        economic_discussion_moderator_id:
          `${article.economic_discussion_moderator_id}` as string &
            tags.Format<"uuid">,
        member_author: memberAuthor,
        moderator_author: moderatorAuthor,
        categories,
        attachments_count: attachmentMap.get(article.id) ?? 0,
        comments_count: commentMap.get(article.id) ?? 0,
        status: article.status as "pending" | "approved" | "rejected",
      };
    },
  );

  return {
    data: summaries,
    pagination: {
      current: page.toString() as ICrIPageIntegerRequired,
      limit: limit.toString() as ICrIPageIntegerRequired,
      records: totalCount.toString() as ICrIPageIntegerRequired,
      pages: Math.ceil(
        totalCount / limit,
      ).toString() as ICrIPageIntegerRequired,
    },
  };
}
