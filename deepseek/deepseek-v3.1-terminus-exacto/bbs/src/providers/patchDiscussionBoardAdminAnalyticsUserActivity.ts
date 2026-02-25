import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { IPageIDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemActivity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSystemActivityAtSummaryTransformer } from "../transformers/DiscussionBoardSystemActivityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAnalyticsUserActivity(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSystemActivity.IRequest;
}): Promise<IPageIDiscussionBoardSystemActivity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build comprehensive WHERE condition handling null/undefined properly
  const whereCondition: Prisma.discussion_board_system_activitiesWhereInput = {
    ...(props.body.activity_type !== undefined &&
      props.body.activity_type !== null && {
        activity_type: props.body.activity_type,
      }),
    ...(props.body.target_entity_type !== undefined &&
      props.body.target_entity_type !== null && {
        target_entity_type: props.body.target_entity_type,
      }),
    ...(props.body.target_entity_id !== undefined &&
      props.body.target_entity_id !== null && {
        target_entity_id: props.body.target_entity_id,
      }),
    ...(props.body.success_status !== undefined &&
      props.body.success_status !== null && {
        success_status: props.body.success_status,
      }),
    ...(props.body.user_id !== undefined &&
      props.body.user_id !== null && {
        user_id: props.body.user_id,
      }),
    ...(props.body.admin_id !== undefined &&
      props.body.admin_id !== null && {
        admin_id: props.body.admin_id,
      }),
    ...(props.body.super_admin_id !== undefined &&
      props.body.super_admin_id !== null && {
        super_admin_id: props.body.super_admin_id,
      }),
    ...(props.body.created_at_from !== undefined &&
      props.body.created_at_from !== null && {
        created_at: {
          gte: new Date(props.body.created_at_from),
        },
      }),
    ...(props.body.created_at_to !== undefined &&
      props.body.created_at_to !== null && {
        created_at: {
          lte: new Date(props.body.created_at_to),
        },
      }),
    ...(props.body.search !== undefined &&
      props.body.search !== null && {
        activity_details: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      }),
  };
  // Fetch paginated data with transformer select
  const [activities, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_system_activities.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardSystemActivityAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_system_activities.count({
      where: whereCondition,
    }),
  ]);
  // Transform data using ArrayUtil.asyncMap
  const transformedData = await ArrayUtil.asyncMap(
    activities,
    DiscussionBoardSystemActivityAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      pagination: {
        pagination: {
          pagination: {
            current: page,
            limit: limit,
            records: total,
            pages: Math.ceil(total / limit),
          } satisfies IPage.IPagination,
          data: [],
        } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination,
        data: [],
      } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination,
      data: [],
    } satisfies IPageIDiscussionBoardSection.IPagination,
  };
}
