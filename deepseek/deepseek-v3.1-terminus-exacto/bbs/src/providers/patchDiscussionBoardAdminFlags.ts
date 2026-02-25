import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardContentFlagAtSummaryTransformer } from "../transformers/DiscussionBoardContentFlagAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminFlags(props: {
  admin: AdminPayload;
  body: IDiscussionBoardContentFlag.IRequest;
}): Promise<IPageIDiscussionBoardContentFlag.ISummary> {
  const pageNumber = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (pageNumber - 1) * limit;
  // Build WHERE clause with proper date handling
  const whereInput = {
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.flag_reason && {
      flag_reason: {
        contains: props.body.flag_reason,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.created_at_start && {
      created_at: { gte: props.body.created_at_start },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: props.body.created_at_end },
    }),
    ...(props.body.resolved_at_start && {
      resolved_at: { gte: props.body.resolved_at_start },
    }),
    ...(props.body.resolved_at_end && {
      resolved_at: { lte: props.body.resolved_at_end },
    }),
    ...(props.body.flagged_article_id && {
      flagged_article_id: props.body.flagged_article_id,
    }),
    ...(props.body.flagged_comment_id && {
      flagged_comment_id: props.body.flagged_comment_id,
    }),
    ...(props.body.reporter_user_id && {
      reporter_user_id: props.body.reporter_user_id,
    }),
    ...(props.body.reviewing_admin_id && {
      reviewing_admin_id: props.body.reviewing_admin_id,
    }),
  } satisfies Prisma.discussion_board_content_flagsWhereInput;
  const data = await MyGlobal.prisma.discussion_board_content_flags.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...DiscussionBoardContentFlagAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_content_flags.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardContentFlagAtSummaryTransformer.transform,
  );
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: pageNumber,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIDiscussionBoardContentFlag.ISummary;
}
