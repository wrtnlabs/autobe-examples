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

export async function patchDiscussionBoardAdminArticlesDraftsOwn(props: {
  admin: AdminPayload;
  body: IDiscussionBoardArticleDraft.IRequest;
}): Promise<IPageIDiscussionBoardArticleDraft.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause for filters
  const whereInput: Prisma.discussion_board_article_draftsWhereInput = {
    draft_deleted_at: null, // Only non-deleted drafts
    // Add search filters
    ...(props.body.search_title && {
      draft_title: { contains: props.body.search_title },
    }),
    ...(props.body.search_content && {
      draft_content: { contains: props.body.search_content },
    }),
    ...(props.body.status && { draft_status: props.body.status }),
    // Date range filters
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
  };
  // Execute queries
  const [drafts, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_drafts.findMany({
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
    }),
    MyGlobal.prisma.discussion_board_article_drafts.count({
      where: whereInput,
    }),
  ]);
  // Transform results
  const data = drafts.map((draft) => ({
    id: draft.id as string & tags.Format<"uuid">,
    draft_title: draft.draft_title,
    draft_status: draft.draft_status,
    last_saved_at: toISOStringSafe(draft.last_saved_at) as string &
      tags.Format<"date-time">,
    draft_created_at: toISOStringSafe(draft.draft_created_at) as string &
      tags.Format<"date-time">,
    draft_updated_at: toISOStringSafe(draft.draft_updated_at) as string &
      tags.Format<"date-time">,
    draft_deleted_at: (draft.draft_deleted_at !== null
      ? toISOStringSafe(draft.draft_deleted_at)
      : null) as (string & tags.Format<"date-time">) | null,
    discussion_board_article_id:
      (draft.discussion_board_article_id as string & tags.Format<"uuid">) ??
      null,
  }));
  return {
    pagination: {
      pagination: {
        current: page satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> as number,
        limit: limit satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100> as number,
        records: total satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0> as number,
        pages: Math.ceil(total / limit) satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0> as number,
      } satisfies IPage.IPagination,
    },
    data,
  } satisfies IPageIDiscussionBoardArticleDraft.ISummary;
}
