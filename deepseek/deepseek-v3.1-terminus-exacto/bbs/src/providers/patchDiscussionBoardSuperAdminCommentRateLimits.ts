import { IDiscussionBoardCommentRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentRateLimit";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardCommentRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentRateLimit";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardCommentRateLimitAtSummaryTransformer } from "../transformers/DiscussionBoardCommentRateLimitAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminCommentRateLimits(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardCommentRateLimit.IRequest;
}): Promise<IPageIDiscussionBoardCommentRateLimit.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.discussion_board_user_id && {
      discussion_board_user_id: props.body.discussion_board_user_id,
    }),
    ...(props.body.start_date && {
      submitted_at: {
        gte: new Date(props.body.start_date),
      },
    }),
    ...(props.body.end_date && {
      submitted_at: {
        lte: new Date(props.body.end_date),
      },
    }),
  } satisfies Prisma.discussion_board_comment_rate_limitsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comment_rate_limits.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { submitted_at: "desc" },
      ...DiscussionBoardCommentRateLimitAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_comment_rate_limits.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardCommentRateLimitAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
