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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSystemActivityAtSummaryTransformer } from "../transformers/DiscussionBoardSystemActivityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSystemActivities(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardSystemActivity.IRequest;
}): Promise<IPageIDiscussionBoardSystemActivity.ISummary> {
  const page = Math.max(props.body.page ?? 1, 1);
  const limit = Math.min(Math.max(props.body.limit ?? 100, 1), 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_system_activitiesWhereInput = {
    ...(props.body.activity_type !== null &&
    props.body.activity_type !== undefined
      ? { activity_type: props.body.activity_type }
      : {}),
    ...(props.body.target_entity_type !== null &&
    props.body.target_entity_type !== undefined
      ? { target_entity_type: props.body.target_entity_type }
      : {}),
    ...(props.body.target_entity_id !== null &&
    props.body.target_entity_id !== undefined
      ? { target_entity_id: props.body.target_entity_id }
      : {}),
    ...(props.body.success_status !== null &&
    props.body.success_status !== undefined
      ? { success_status: props.body.success_status }
      : {}),
    ...(props.body.user_id !== null && props.body.user_id !== undefined
      ? { user_id: props.body.user_id }
      : {}),
    ...(props.body.admin_id !== null && props.body.admin_id !== undefined
      ? { admin_id: props.body.admin_id }
      : {}),
    ...(props.body.super_admin_id !== null &&
    props.body.super_admin_id !== undefined
      ? { super_admin_id: props.body.super_admin_id }
      : {}),
    ...(props.body.created_at_from !== null &&
    props.body.created_at_from !== undefined
      ? { created_at: { gte: props.body.created_at_from } }
      : {}),
    ...(props.body.created_at_to !== null &&
    props.body.created_at_to !== undefined
      ? { created_at: { lte: props.body.created_at_to } }
      : {}),
    ...(props.body.search !== null && props.body.search !== undefined
      ? {
          OR: [
            {
              activity_type: {
                contains: props.body.search,
                mode: "insensitive" as const,
              },
            },
            {
              target_entity_type: {
                contains: props.body.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };
  const [activities, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_system_activities.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...DiscussionBoardSystemActivityAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_system_activities.count({
      where: whereInput,
    }),
  ]);
  const transformedActivities = await ArrayUtil.asyncMap(
    activities,
    DiscussionBoardSystemActivityAtSummaryTransformer.transform,
  );
  // Create the nested pagination structure
  const innerPagination = {
    current: page satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: limit satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
    records: total satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
    pages: Math.ceil(total / limit) satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  } satisfies IPage.IPagination;
  const adminDistPagination = {
    pagination: innerPagination,
    data: [] as IDiscussionBoardAdministratorDistributionStatistic.IPagination[],
  } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination;
  const adminPromPagination = {
    pagination: adminDistPagination,
    data: [] as IDiscussionBoardAdministratorPromotionRequest.IPagination[],
  } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination;
  const sectionPagination = {
    pagination: adminPromPagination,
    data: [] as IDiscussionBoardSection.IPagination[],
  } satisfies IPageIDiscussionBoardSection.IPagination;
  return {
    data: transformedActivities,
    pagination: sectionPagination,
  } satisfies IPageIDiscussionBoardSystemActivity.ISummary;
}
