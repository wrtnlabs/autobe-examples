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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAnalyticsBanDurations(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardBanDuration.IRequest;
}): Promise<IPageIDiscussionBoardBanDuration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions for ban durations
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && { name: { contains: props.body.search } }),
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
  // Query ban durations with pagination
  const durations =
    await MyGlobal.prisma.discussion_board_ban_durations.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  // Get total count for pagination
  const total = await MyGlobal.prisma.discussion_board_ban_durations.count({
    where: whereInput,
  });
  // Transform to ISummary format (without usage stats since they're not in the DTO)
  const data = durations.map((duration) => ({
    id: duration.id as string & tags.Format<"uuid">,
    name: duration.name,
    description: duration.description,
    duration_hours: duration.duration_hours,
    is_permanent: duration.is_permanent,
  }));
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
