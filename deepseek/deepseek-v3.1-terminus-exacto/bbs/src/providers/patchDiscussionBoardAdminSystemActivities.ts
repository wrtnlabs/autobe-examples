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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardAdminSystemActivities(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSystemActivity.IRequest;
}): Promise<IPageIDiscussionBoardSystemActivity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause with proper handling of null/undefined
  const whereInput: Prisma.discussion_board_system_activitiesWhereInput = {};
  // Add basic filters with null checks
  if (
    props.body.activity_type !== undefined &&
    props.body.activity_type !== null
  ) {
    whereInput.activity_type = props.body.activity_type;
  }
  if (
    props.body.target_entity_type !== undefined &&
    props.body.target_entity_type !== null
  ) {
    whereInput.target_entity_type = props.body.target_entity_type;
  }
  if (
    props.body.target_entity_id !== undefined &&
    props.body.target_entity_id !== null
  ) {
    whereInput.target_entity_id = props.body.target_entity_id;
  }
  if (
    props.body.success_status !== undefined &&
    props.body.success_status !== null
  ) {
    whereInput.success_status = props.body.success_status;
  }
  if (props.body.user_id !== undefined && props.body.user_id !== null) {
    whereInput.user_id = props.body.user_id;
  }
  if (props.body.admin_id !== undefined && props.body.admin_id !== null) {
    whereInput.admin_id = props.body.admin_id;
  }
  if (
    props.body.super_admin_id !== undefined &&
    props.body.super_admin_id !== null
  ) {
    whereInput.super_admin_id = props.body.super_admin_id;
  }
  // Handle search filter
  if (props.body.search !== undefined && props.body.search !== null) {
    whereInput.OR = [
      { activity_type: { contains: props.body.search, mode: "insensitive" } },
      {
        target_entity_type: {
          contains: props.body.search,
          mode: "insensitive",
        },
      },
      {
        activity_details: { contains: props.body.search, mode: "insensitive" },
      },
    ];
  }
  // Handle date range filtering
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (
      props.body.created_at_from !== undefined &&
      props.body.created_at_from !== null
    ) {
      dateFilter.gte = new Date(props.body.created_at_from);
    }
    if (
      props.body.created_at_to !== undefined &&
      props.body.created_at_to !== null
    ) {
      dateFilter.lte = new Date(props.body.created_at_to);
    }
    whereInput.created_at = dateFilter;
  }
  const data =
    await MyGlobal.prisma.discussion_board_system_activities.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardSystemActivityAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.discussion_board_system_activities.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSystemActivityAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardSystemActivity.ISummary;
}
