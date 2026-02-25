import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationActionType";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardModerationActionTypeAtSummaryTransformer } from "../transformers/DiscussionBoardModerationActionTypeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminModerationActionTypes(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardModerationActionType.IRequest;
}): Promise<IPageIDiscussionBoardModerationActionType.ISummary> {
  const page = props.body.page !== undefined ? Math.max(1, props.body.page) : 1;
  const limit =
    props.body.limit !== undefined
      ? Math.max(1, Math.min(100, props.body.limit))
      : 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.category !== undefined &&
      props.body.category !== null && {
        category: props.body.category,
      }),
    ...(props.body.severity_level !== undefined &&
      props.body.severity_level !== null && {
        severity_level: props.body.severity_level,
      }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  } satisfies Prisma.discussion_board_moderation_action_typesWhereInput;
  const orderByInput = (
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" as const }
      : props.body.sort === "name_asc"
        ? { name: "asc" as const }
        : props.body.sort === "name_desc"
          ? { name: "desc" as const }
          : { created_at: "desc" as const }
  ) satisfies Prisma.discussion_board_moderation_action_typesOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderation_action_types.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...DiscussionBoardModerationActionTypeAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_moderation_action_types.count({
      where: whereInput,
    }),
  ]);
  // Construct the nested pagination structure according to the DTO hierarchy
  const innerPagination: IPage.IPagination = {
    /**
     * Current page number being viewed (1-indexed).
     */
    current: page,
    /**
     * Maximum number of records per page.
     */
    limit: limit,
    /**
     * Total count of all records matching the query criteria.
     */
    records: total,
    /**
     * Total number of pages available.
     */
    pages: Math.ceil(total / limit),
  };
  const distributionStatPagination: IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination =
    {
      pagination: innerPagination,
      data: [],
    };
  const promotionRequestPagination: IPageIDiscussionBoardAdministratorPromotionRequest.IPagination =
    {
      pagination: distributionStatPagination,
      data: [],
    };
  const sectionPagination: IPageIDiscussionBoardSection.IPagination = {
    pagination: promotionRequestPagination,
    data: [],
  };
  return {
    pagination: sectionPagination,
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardModerationActionTypeAtSummaryTransformer.transform,
    ),
  };
}
