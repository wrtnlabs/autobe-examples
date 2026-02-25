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

export async function patchDiscussionBoardSuperAdminAnalyticsUserActivity(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardSystemActivity.IRequest;
}): Promise<IPageIDiscussionBoardSystemActivity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereClause: Prisma.discussion_board_system_activitiesWhereInput = {
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
      props.body.user_id !== null && { user_id: props.body.user_id }),
    ...(props.body.admin_id !== undefined &&
      props.body.admin_id !== null && { admin_id: props.body.admin_id }),
    ...(props.body.super_admin_id !== undefined &&
      props.body.super_admin_id !== null && {
        super_admin_id: props.body.super_admin_id,
      }),
    ...(props.body.created_at_from !== undefined &&
      props.body.created_at_from !== null && {
        created_at: { gte: new Date(props.body.created_at_from) },
      }),
    ...(props.body.created_at_to !== undefined &&
      props.body.created_at_to !== null && {
        created_at: { lte: new Date(props.body.created_at_to) },
      }),
  } satisfies Prisma.discussion_board_system_activitiesWhereInput;
  const data =
    await MyGlobal.prisma.discussion_board_system_activities.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...DiscussionBoardSystemActivityAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.discussion_board_system_activities.count({
    where: whereClause,
  });
  const transformed = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSystemActivityAtSummaryTransformer.transform,
  );
  const pagination: IPage.IPagination = typia.assert<IPage.IPagination>({
    current: page satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    limit: limit satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    records: total satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    pages: Math.ceil(total / limit) satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  });
  return {
    data: transformed,
    pagination,
  };
}
