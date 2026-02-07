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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardUserBanAtSummaryTransformer } from "../transformers/DiscussionBoardUserBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAnalyticsBans(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardUserBan.IRequest;
}): Promise<IPageIDiscussionBoardUserBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper date handling
  const whereInput: Prisma.discussion_board_user_bansWhereInput = {};
  // Apply simple filters
  if (props.body.ban_status !== undefined && props.body.ban_status !== null) {
    whereInput.ban_status = props.body.ban_status;
  }
  if (
    props.body.ban_duration_type !== undefined &&
    props.body.ban_duration_type !== null
  ) {
    whereInput.ban_duration_type = props.body.ban_duration_type;
  }
  if (
    props.body.appeal_status !== undefined &&
    props.body.appeal_status !== null
  ) {
    whereInput.appeal_status = props.body.appeal_status;
  }
  if (
    props.body.banning_administrator_id !== undefined &&
    props.body.banning_administrator_id !== null
  ) {
    whereInput.banning_administrator_id = props.body.banning_administrator_id;
  }
  // Apply date range filters with proper null handling
  if (props.body.ban_started_at_from || props.body.ban_started_at_to) {
    whereInput.ban_started_at = {};
    if (props.body.ban_started_at_from) {
      whereInput.ban_started_at.gte = new Date(props.body.ban_started_at_from);
    }
    if (props.body.ban_started_at_to) {
      whereInput.ban_started_at.lte = new Date(props.body.ban_started_at_to);
    }
  }
  if (props.body.ban_ends_at_from || props.body.ban_ends_at_to) {
    whereInput.ban_ends_at = {};
    if (props.body.ban_ends_at_from) {
      whereInput.ban_ends_at.gte = new Date(props.body.ban_ends_at_from);
    }
    if (props.body.ban_ends_at_to) {
      whereInput.ban_ends_at.lte = new Date(props.body.ban_ends_at_to);
    }
  }
  // Apply search filter
  if (props.body.search) {
    whereInput.ban_reason = {
      contains: props.body.search,
      mode: "insensitive" as const,
    };
  }
  // Execute queries sequentially for better error handling
  const data = await MyGlobal.prisma.discussion_board_user_bans.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...DiscussionBoardUserBanAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_user_bans.count({
    where: whereInput,
  });
  // Transform results
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
    },
  };
}
