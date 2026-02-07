import { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
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

export async function patchDiscussionBoardAdminAnalyticsFlags(props: {
  admin: AdminPayload;
  body: IDiscussionBoardContentFlag.IRequest;
}): Promise<IPageIDiscussionBoardContentFlag.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper date handling
  const whereInput = {
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.reporter_user_id && {
      reporter_user_id: props.body.reporter_user_id,
    }),
    ...(props.body.flagged_article_id && {
      flagged_article_id: props.body.flagged_article_id,
    }),
    ...(props.body.flagged_comment_id && {
      flagged_comment_id: props.body.flagged_comment_id,
    }),
    ...(props.body.reviewing_admin_id && {
      reviewing_admin_id: props.body.reviewing_admin_id,
    }),
    ...(props.body.flag_reason && {
      flag_reason: { contains: props.body.flag_reason },
    }),
    ...(props.body.created_at_min && {
      created_at: { gte: new Date(props.body.created_at_min) },
    }),
    ...(props.body.created_at_max && {
      created_at: { lte: new Date(props.body.created_at_max) },
    }),
    ...(props.body.resolved_at_min && {
      resolved_at: { gte: new Date(props.body.resolved_at_min) },
    }),
    ...(props.body.resolved_at_max && {
      resolved_at: { lte: new Date(props.body.resolved_at_max) },
    }),
  } satisfies Prisma.discussion_board_content_flagsWhereInput;
  // Sequential operations instead of Promise.all
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
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
