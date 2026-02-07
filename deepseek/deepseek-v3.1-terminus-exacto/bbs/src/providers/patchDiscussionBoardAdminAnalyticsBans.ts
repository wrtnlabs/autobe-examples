import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardUserBanAtSummaryTransformer } from "../transformers/DiscussionBoardUserBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAnalyticsBans(props: {
  admin: AdminPayload;
  body: IDiscussionBoardUserBan.IRequest;
}): Promise<IPageIDiscussionBoardUserBan.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.max(1, Math.min(100, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  // Build WHERE clause with comprehensive filtering
  const whereInput = {
    ...(props.body.ban_status && { ban_status: props.body.ban_status }),
    ...(props.body.ban_duration_type && {
      ban_duration_type: props.body.ban_duration_type,
    }),
    ...(props.body.appeal_status && {
      appeal_status: props.body.appeal_status,
    }),
    ...(props.body.banning_administrator_id && {
      banning_administrator_id: props.body.banning_administrator_id,
    }),
    ...(props.body.ban_started_at_from && {
      ban_started_at: {
        gte: toISOStringSafe(props.body.ban_started_at_from),
      },
    }),
    ...(props.body.ban_started_at_to && {
      ban_started_at: {
        lte: toISOStringSafe(props.body.ban_started_at_to),
      },
    }),
    ...(props.body.ban_ends_at_from && {
      ban_ends_at: {
        gte: toISOStringSafe(props.body.ban_ends_at_from),
      },
    }),
    ...(props.body.ban_ends_at_to && {
      ban_ends_at: {
        lte: toISOStringSafe(props.body.ban_ends_at_to),
      },
    }),
    ...(props.body.search && {
      ban_reason: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
  } satisfies Prisma.discussion_board_user_bansWhereInput;
  // Query paginated data
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_user_bans.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardUserBanAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_user_bans.count({
      where: whereInput,
    }),
  ]);
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardUserBanAtSummaryTransformer.transform,
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
