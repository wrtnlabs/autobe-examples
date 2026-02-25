import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleViewStatEvent";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminCommentsAnalytics(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardArticleViewStatEvent.IRequest;
}): Promise<IPageIDiscussionBoardArticleViewStatEvent.ISummary> {
  const { superAdmin, body } = props;
  // Extract pagination parameters (required fields)
  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;
  // Build WHERE conditions using string date comparisons (no Date objects)
  const whereConditions: Prisma.discussion_board_commentsWhereInput = {
    deleted_at: null,
    created_at: {
      ...(body.start_date && { gte: body.start_date }),
      ...(body.end_date && { lte: body.end_date }),
    },
  };
  // Apply section filtering if requested
  if (body.section_id) {
    whereConditions.article = {
      discussion_board_section_id: body.section_id,
    };
  }
  // User type filtering would require complex JOINs for role discrimination
  // This is beyond current schema capabilities
  // Query comments with aggregated engagement data
  const comments = await MyGlobal.prisma.discussion_board_comments.findMany({
    where: whereConditions,
    include: {
      author: {
        select: { id: true, display_name: true, bio: true, created_at: true },
      },
      article: {
        include: {
          section: {
            select: {
              id: true,
              name: true,
              description: true,
              status: true,
              display_order: true,
              deleted_at: true,
            },
          },
        },
      },
      votes: {
        select: {
          vote_type: true,
          created_at: true,
          user: { select: { id: true } },
        },
      },
    },
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.discussion_board_comments.count({
    where: whereConditions,
  });
  // Transform to analytics format with proper typing
  const data: IDiscussionBoardArticleViewStatEvent.ISummary[] = comments.map(
    (comment) => {
      const uniqueVoters = new Set(comment.votes.map((vote) => vote.user.id));
      const lastVoteTime =
        comment.votes.length > 0
          ? comment.votes.reduce(
              (latest, vote) =>
                vote.created_at > latest ? vote.created_at : latest,
              comment.votes[0].created_at,
            )
          : null;
      return {
        id: comment.id as string & tags.Format<"uuid">,
        total_view_count: comment.votes.length,
        unique_viewer_count: uniqueVoters.size,
        last_viewed_at: lastVoteTime
          ? (lastVoteTime.toISOString() as string & tags.Format<"date-time">)
          : null,
        average_time_spent_seconds: null,
        article: {
          id: comment.article.id as string & tags.Format<"uuid">,
          title: comment.article.title,
          status: comment.article.status,
          created_at: comment.article.created_at.toISOString() as string &
            tags.Format<"date-time">,
          author: {
            id: comment.author.id as string & tags.Format<"uuid">,
            display_name: comment.author.display_name,
            bio: comment.author.bio ?? null,
            created_at: comment.author.created_at.toISOString() as string &
              tags.Format<"date-time">,
          } satisfies IDiscussionBoardUser.ISummary,
          section: {
            id: comment.article.section.id as string & tags.Format<"uuid">,
            name: comment.article.section.name,
            description: comment.article.section.description,
            status: comment.article.section.status,
            display_order: comment.article.section.display_order,
            deleted_at:
              (comment.article.section.deleted_at?.toISOString() as string &
                tags.Format<"date-time">) ?? null,
          } satisfies IDiscussionBoardSection.ISummary,
        } satisfies IDiscussionBoardArticle.ISummary,
      };
    },
  );
  // Build the nested pagination structure matching DTO definitions
  const paginationStructure: IPageIDiscussionBoardSection.IPagination = {
    pagination: {
      pagination: {
        pagination: {
          current: page,
          limit: limit,
          records: total,
          pages: Math.ceil(total / limit),
        } satisfies IPage.IPagination,
        data: [] as IDiscussionBoardAdministratorDistributionStatistic.IPagination[],
      } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination,
      data: [] as IDiscussionBoardAdministratorPromotionRequest.IPagination[],
    } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination,
    data: [] as IDiscussionBoardSection.IPagination[],
  };
  return {
    pagination: paginationStructure,
    data,
  };
}
