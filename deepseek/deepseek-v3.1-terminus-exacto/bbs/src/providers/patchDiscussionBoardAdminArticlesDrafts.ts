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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardAdminArticlesDrafts(props: {
  admin: AdminPayload;
  body: IDiscussionBoardArticleDraft.IRequest;
}): Promise<IPageIDiscussionBoardArticleDraft.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    draft_deleted_at: null,
    ...(props.body.search_title && {
      draft_title: { contains: props.body.search_title },
    }),
    ...(props.body.search_content && {
      draft_content: { contains: props.body.search_content },
    }),
    ...(props.body.status && { draft_status: props.body.status }),
    ...(props.body.last_saved_at_from && {
      last_saved_at: { gte: new Date(props.body.last_saved_at_from) },
    }),
    ...(props.body.last_saved_at_to && {
      last_saved_at: { lte: new Date(props.body.last_saved_at_to) },
    }),
    ...(props.body.draft_created_at_from && {
      draft_created_at: { gte: new Date(props.body.draft_created_at_from) },
    }),
    ...(props.body.draft_created_at_to && {
      draft_created_at: { lte: new Date(props.body.draft_created_at_to) },
    }),
    ...(props.body.draft_updated_at_from && {
      draft_updated_at: { gte: new Date(props.body.draft_updated_at_from) },
    }),
    ...(props.body.draft_updated_at_to && {
      draft_updated_at: { lte: new Date(props.body.draft_updated_at_to) },
    }),
  } satisfies Prisma.discussion_board_article_draftsWhereInput;
  const data = await MyGlobal.prisma.discussion_board_article_drafts.findMany({
    where: whereInput,
    orderBy: { last_saved_at: "desc" as const },
    skip,
    take: limit,
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
  return {
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      draft_title: record.draft_title,
      draft_status: record.draft_status,
      last_saved_at: toISOStringSafe(record.last_saved_at),
      draft_created_at: toISOStringSafe(record.draft_created_at),
      draft_updated_at: toISOStringSafe(record.draft_updated_at),
      draft_deleted_at: record.draft_deleted_at
        ? toISOStringSafe(record.draft_deleted_at)
        : null,
      discussion_board_article_id: record.discussion_board_article_id as
        | (string & tags.Format<"uuid">)
        | null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
