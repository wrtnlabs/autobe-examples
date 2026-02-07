import { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanDuration";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardBanDurationAtSummaryTransformer } from "../transformers/DiscussionBoardBanDurationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminBanDurations(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardBanDuration.IRequest;
}): Promise<IPageIDiscussionBoardBanDuration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper filtering
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      name: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.duration_hours_min !== undefined && {
      duration_hours: { gte: props.body.duration_hours_min },
    }),
    ...(props.body.duration_hours_max !== undefined && {
      duration_hours: { lte: props.body.duration_hours_max },
    }),
    ...(props.body.is_permanent !== undefined && {
      is_permanent: props.body.is_permanent,
    }),
  } satisfies Prisma.discussion_board_ban_durationsWhereInput;
  // Execute queries in parallel
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_ban_durations.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { name: "asc" as const },
      ...DiscussionBoardBanDurationAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_ban_durations.count({
      where: whereInput,
    }),
  ]);
  // Transform data using async map
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardBanDurationAtSummaryTransformer.transform,
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
