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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardAdminContentFlags(props: {
  admin: AdminPayload;
  body: IDiscussionBoardContentFlag.IRequest;
}): Promise<IPageIDiscussionBoardContentFlag.ISummary> {
  const currentPage = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 20), 100);
  const skip = (currentPage - 1) * limit;
  // Build WHERE conditions with proper date handling
  const whereInput = {
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.flag_reason && {
      flag_reason: { contains: props.body.flag_reason, mode: "insensitive" },
    }),
    ...(props.body.created_at_start && {
      created_at: {
        gte: new Date(props.body.created_at_start),
      },
    }),
    ...(props.body.created_at_end && {
      created_at: {
        lte: new Date(props.body.created_at_end),
      },
    }),
    ...(props.body.resolved_at_start && {
      resolved_at: props.body.resolved_at_start
        ? {
            gte: new Date(props.body.resolved_at_start),
          }
        : undefined,
    }),
    ...(props.body.resolved_at_end && {
      resolved_at: props.body.resolved_at_end
        ? {
            lte: new Date(props.body.resolved_at_end),
          }
        : undefined,
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
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_content_flags.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" } as const,
      ...DiscussionBoardContentFlagAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_content_flags.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardContentFlagAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: currentPage satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardContentFlag.ISummary;
}
