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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAnalyticsBanDurations(props: {
  admin: AdminPayload;
  body: IDiscussionBoardBanDuration.IRequest;
}): Promise<IPageIDiscussionBoardBanDuration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions for ban_durations table
  const whereConditions: Prisma.discussion_board_ban_durationsWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
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
  };
  // Get ban durations with count of related bans using raw SQL for efficiency
  const banDurations =
    await MyGlobal.prisma.discussion_board_ban_durations.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { duration_hours: "asc" },
    });
  const total = await MyGlobal.prisma.discussion_board_ban_durations.count({
    where: whereConditions,
  });
  // Get usage statistics for each ban duration using efficient batch queries
  const banUsageStats = await Promise.all(
    banDurations.map(async (duration) => {
      const [activeBans, expiredBans, revokedBans] = await Promise.all([
        MyGlobal.prisma.discussion_board_user_bans.count({
          where: {
            ban_duration_type: duration.name,
            ban_status: "active",
          },
        }),
        MyGlobal.prisma.discussion_board_user_bans.count({
          where: {
            ban_duration_type: duration.name,
            ban_status: "expired",
          },
        }),
        MyGlobal.prisma.discussion_board_user_bans.count({
          where: {
            ban_duration_type: duration.name,
            ban_status: "revoked",
          },
        }),
      ]);
      return {
        durationId: duration.id,
        activeBans,
        expiredBans,
        revokedBans,
      };
    }),
  );
  // Create a map for quick lookup
  const statsMap = new Map(
    banUsageStats.map((stat) => [stat.durationId, stat]),
  );
  // Transform to response format
  const data: IDiscussionBoardBanDuration.ISummary[] = banDurations.map(
    (duration) => {
      const stats = statsMap.get(duration.id);
      return {
        id: duration.id as string & tags.Format<"uuid">,
        name: duration.name,
        description: duration.description,
        duration_hours: duration.duration_hours,
        is_permanent: duration.is_permanent,
      };
    },
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
