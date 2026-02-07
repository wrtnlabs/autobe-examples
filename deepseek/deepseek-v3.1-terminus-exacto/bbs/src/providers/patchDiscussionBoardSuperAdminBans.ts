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

export async function patchDiscussionBoardSuperAdminBans(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardUserBan.IRequest;
}): Promise<IPageIDiscussionBoardUserBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100); // Enforce maximum limit
  const skip = (page - 1) * limit;
  // Build where conditions, filtering out empty conditions
  const conditions: Prisma.discussion_board_user_bansWhereInput[] = [];
  // Simple filters
  if (props.body.ban_status)
    conditions.push({ ban_status: props.body.ban_status });
  if (props.body.ban_duration_type)
    conditions.push({ ban_duration_type: props.body.ban_duration_type });
  if (props.body.appeal_status)
    conditions.push({ appeal_status: props.body.appeal_status });
  if (props.body.banning_administrator_id)
    conditions.push({
      banning_administrator_id: props.body.banning_administrator_id,
    });
  // Date range filters with ISO string validation
  if (props.body.ban_started_at_from || props.body.ban_started_at_to) {
    const banStartedAt: Prisma.DateTimeFilter = {};
    if (props.body.ban_started_at_from)
      banStartedAt.gte = toISOStringSafe(props.body.ban_started_at_from);
    if (props.body.ban_started_at_to)
      banStartedAt.lte = toISOStringSafe(props.body.ban_started_at_to);
    conditions.push({ ban_started_at: banStartedAt });
  }
  if (props.body.ban_ends_at_from || props.body.ban_ends_at_to) {
    const banEndsAt: Prisma.DateTimeNullableFilter = {};
    if (props.body.ban_ends_at_from)
      banEndsAt.gte = toISOStringSafe(props.body.ban_ends_at_from);
    if (props.body.ban_ends_at_to)
      banEndsAt.lte = toISOStringSafe(props.body.ban_ends_at_to);
    conditions.push({ ban_ends_at: banEndsAt });
  }
  // Text search filter
  if (props.body.search) {
    conditions.push({
      ban_reason: { contains: props.body.search, mode: "insensitive" as const },
    });
  }
  const whereInput: Prisma.discussion_board_user_bansWhereInput =
    conditions.length > 0 ? { AND: conditions } : {};
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_user_bans.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...DiscussionBoardUserBanAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_user_bans.count({
      where: whereInput,
    }),
  ]);
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
