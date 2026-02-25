import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleDraft";
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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardSuperAdminArticlesDrafts(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardArticleDraft.IRequest;
}): Promise<IPageIDiscussionBoardArticleDraft.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause with comprehensive filtering
  const whereInput: Prisma.discussion_board_article_draftsWhereInput = {
    draft_deleted_at: null,
    ...(props.body.search_title && {
      draft_title: {
        contains: props.body.search_title,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.search_content && {
      draft_content: {
        contains: props.body.search_content,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.status && { draft_status: props.body.status }),
    ...((props.body.last_saved_at_from || props.body.last_saved_at_to) && {
      last_saved_at: {
        ...(props.body.last_saved_at_from && {
          gte: new Date(props.body.last_saved_at_from),
        }),
        ...(props.body.last_saved_at_to && {
          lte: new Date(props.body.last_saved_at_to),
        }),
      },
    }),
    ...((props.body.draft_created_at_from ||
      props.body.draft_created_at_to) && {
      draft_created_at: {
        ...(props.body.draft_created_at_from && {
          gte: new Date(props.body.draft_created_at_from),
        }),
        ...(props.body.draft_created_at_to && {
          lte: new Date(props.body.draft_created_at_to),
        }),
      },
    }),
    ...((props.body.draft_updated_at_from ||
      props.body.draft_updated_at_to) && {
      draft_updated_at: {
        ...(props.body.draft_updated_at_from && {
          gte: new Date(props.body.draft_updated_at_from),
        }),
        ...(props.body.draft_updated_at_to && {
          lte: new Date(props.body.draft_updated_at_to),
        }),
      },
    }),
  };
  // Execute queries sequentially for better error handling
  const data = await MyGlobal.prisma.discussion_board_article_drafts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { last_saved_at: "desc" as const },
    select: {
      id: true,
      draft_title: true,
      draft_status: true,
      last_saved_at: true,
      draft_created_at: true,
      draft_updated_at: true,
      draft_deleted_at: true,
      discussion_board_article_id: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_article_drafts.count({
    where: whereInput,
  });
  // Transform database results to DTO format
  const transformedData: IDiscussionBoardArticleDraft.ISummary[] = data.map(
    (item) => ({
      id: item.id,
      draft_title: item.draft_title,
      draft_status: item.draft_status,
      last_saved_at: toISOStringSafe(item.last_saved_at),
      draft_created_at: toISOStringSafe(item.draft_created_at),
      draft_updated_at: toISOStringSafe(item.draft_updated_at),
      draft_deleted_at: item.draft_deleted_at
        ? toISOStringSafe(item.draft_deleted_at)
        : null,
      discussion_board_article_id: item.discussion_board_article_id,
    }),
  );
  // Correct pagination structure according to DTO hierarchy
  return {
    data: transformedData,
    pagination: {
      pagination: {
        pagination: {
          pagination: {
            current: page,
            limit: limit,
            records: total,
            pages: Math.ceil(total / limit),
          } satisfies IPage.IPagination,
          data: [] satisfies IDiscussionBoardAdministratorDistributionStatistic.IPagination[],
        } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination,
        data: [] satisfies IDiscussionBoardAdministratorPromotionRequest.IPagination[],
      } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination,
      data: [] satisfies IDiscussionBoardSection.IPagination[],
    } satisfies IPageIDiscussionBoardSection.IPagination,
  } satisfies IPageIDiscussionBoardArticleDraft.ISummary;
}
