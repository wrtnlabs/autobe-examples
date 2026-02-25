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
export async function patchDiscussionBoardSuperAdminArticlesDraftsOwn(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardArticleDraft.IRequest;
}): Promise<IPageIDiscussionBoardArticleDraft.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_article_draftsWhereInput = {
    draft_deleted_at: null,
  };
  // Apply text search filters
  if (props.body.search_title) {
    whereInput.draft_title = {
      contains: props.body.search_title,
      mode: "insensitive",
    };
  }
  if (props.body.search_content) {
    whereInput.draft_content = {
      contains: props.body.search_content,
      mode: "insensitive",
    };
  }
  // Apply status filter
  if (props.body.status) {
    whereInput.draft_status = props.body.status;
  }
  // Apply date range filters
  const dateFilterBuilder = (from?: string, to?: string) => ({
    ...(from && { gte: from }),
    ...(to && { lte: to }),
  });
  if (props.body.last_saved_at_from || props.body.last_saved_at_to) {
    whereInput.last_saved_at = dateFilterBuilder(
      props.body.last_saved_at_from,
      props.body.last_saved_at_to,
    );
  }
  if (props.body.draft_created_at_from || props.body.draft_created_at_to) {
    whereInput.draft_created_at = dateFilterBuilder(
      props.body.draft_created_at_from,
      props.body.draft_created_at_to,
    );
  }
  if (props.body.draft_updated_at_from || props.body.draft_updated_at_to) {
    whereInput.draft_updated_at = dateFilterBuilder(
      props.body.draft_updated_at_from,
      props.body.draft_updated_at_to,
    );
  }
  const data = await MyGlobal.prisma.discussion_board_article_drafts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { last_saved_at: "desc" },
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
  const transformedData = data.map((draft) => ({
    id: draft.id as string & tags.Format<"uuid">,
    draft_title: draft.draft_title,
    draft_status: draft.draft_status,
    last_saved_at: draft.last_saved_at.toISOString(),
    draft_created_at: draft.draft_created_at.toISOString(),
    draft_updated_at: draft.draft_updated_at.toISOString(),
    draft_deleted_at: draft.draft_deleted_at?.toISOString() ?? null,
    discussion_board_article_id: draft.discussion_board_article_id as
      | (string & tags.Format<"uuid">)
      | null,
  }));
  return {
    data: transformedData,
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardArticleDraft.ISummary;
}
