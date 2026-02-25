import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminSession";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAdminSessionAtSummaryTransformer } from "../transformers/DiscussionBoardAdminSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAdminsSessions(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdminSession.IRequest;
}): Promise<IPageIDiscussionBoardAdminSession.ISummary> {
  const pageNumber = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (pageNumber - 1) * limit;
  // Check if admin is super admin
  const administrator =
    await MyGlobal.prisma.discussion_board_administrators.findFirst({
      where: {
        user_id: props.admin.id,
        is_active: true,
        deleted_at: null,
      },
    });
  const isSuperAdmin = administrator?.grade === "super";
  // Build WHERE conditions using Prisma syntax
  const whereConditions: Prisma.discussion_board_admin_sessionsWhereInput[] =
    [];
  // Authorization: regular admins only see their own sessions
  if (!isSuperAdmin) {
    whereConditions.push({ discussion_board_admin_id: props.admin.id });
  }
  // Apply optional filters
  if (props.body.discussion_board_admin_id !== undefined) {
    whereConditions.push({
      discussion_board_admin_id: props.body.discussion_board_admin_id,
    });
  }
  if (props.body.ip !== undefined) {
    whereConditions.push({ ip: { contains: props.body.ip } });
  }
  if (props.body.user_agent !== undefined) {
    whereConditions.push({ user_agent: { contains: props.body.user_agent } });
  }
  // Active sessions filter (not expired) - use current Date directly
  const currentTimestamp = new Date();
  if (props.body.active_only === true) {
    whereConditions.push({ expired_at: { gt: currentTimestamp } });
  }
  // Date range filters with string to Date conversion
  if (props.body.created_at_start !== undefined) {
    whereConditions.push({
      created_at: { gte: new Date(props.body.created_at_start) },
    });
  }
  if (props.body.created_at_end !== undefined) {
    whereConditions.push({
      created_at: { lte: new Date(props.body.created_at_end) },
    });
  }
  if (props.body.expired_at_start !== undefined) {
    whereConditions.push({
      expired_at: { gte: new Date(props.body.expired_at_start) },
    });
  }
  if (props.body.expired_at_end !== undefined) {
    whereConditions.push({
      expired_at: { lte: new Date(props.body.expired_at_end) },
    });
  }
  if (props.body.last_accessed_at_start !== undefined) {
    whereConditions.push({
      last_accessed_at: { gte: new Date(props.body.last_accessed_at_start) },
    });
  }
  if (props.body.last_accessed_at_end !== undefined) {
    whereConditions.push({
      last_accessed_at: { lte: new Date(props.body.last_accessed_at_end) },
    });
  }
  // Combine WHERE conditions
  const whereInput =
    whereConditions.length > 0
      ? ({
          AND: whereConditions,
        } satisfies Prisma.discussion_board_admin_sessionsWhereInput)
      : ({} satisfies Prisma.discussion_board_admin_sessionsWhereInput);
  // Query data with pagination
  const data = await MyGlobal.prisma.discussion_board_admin_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" } as const,
    ...DiscussionBoardAdminSessionAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.discussion_board_admin_sessions.count({
    where: whereInput,
  });
  // Transform data using imported ArrayUtil directly
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAdminSessionAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: pageNumber satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      pages:
        total > 0
          ? Math.ceil(total / limit)
          : (0 satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<0>),
    } satisfies IPage.IPagination,
  };
}
