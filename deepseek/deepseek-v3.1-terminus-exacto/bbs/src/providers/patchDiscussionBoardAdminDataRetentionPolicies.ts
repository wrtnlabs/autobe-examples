import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDataRetentionPolicy";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardDataRetentionPolicyAtSummaryTransformer } from "../transformers/DiscussionBoardDataRetentionPolicyAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardAdminDataRetentionPolicies(props: {
  admin: AdminPayload;
  body: IDiscussionBoardDataRetentionPolicy.IRequest;
}): Promise<IPageIDiscussionBoardDataRetentionPolicy.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  const retentionPeriodDaysMin =
    props.body.retention_period_days_min !== undefined &&
    props.body.retention_period_days_min !== null
      ? (props.body.retention_period_days_min satisfies number as number)
      : undefined;
  const retentionPeriodDaysMax =
    props.body.retention_period_days_max !== undefined &&
    props.body.retention_period_days_max !== null
      ? (props.body.retention_period_days_max satisfies number as number)
      : undefined;
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      policy_name: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.compliance_standard !== undefined &&
      props.body.compliance_standard !== null && {
        compliance_standard: { equals: props.body.compliance_standard },
      }),
    ...(props.body.retention_action !== undefined &&
      props.body.retention_action !== null && {
        retention_action: { equals: props.body.retention_action },
      }),
    ...(props.body.is_active !== undefined &&
      props.body.is_active !== null && {
        is_active: { equals: props.body.is_active },
      }),
    ...((retentionPeriodDaysMin !== undefined ||
      retentionPeriodDaysMax !== undefined) && {
      retention_period_days: {
        ...(retentionPeriodDaysMin !== undefined && {
          gte: retentionPeriodDaysMin,
        }),
        ...(retentionPeriodDaysMax !== undefined && {
          lte: retentionPeriodDaysMax,
        }),
      },
    }),
  } satisfies Prisma.discussion_board_data_retention_policiesWhereInput;
  const orderByInput = (
    props.body.sort === "policy_name"
      ? { policy_name: "asc" as const }
      : props.body.sort === "updated_at"
        ? { updated_at: "desc" as const }
        : { created_at: "desc" as const }
  ) satisfies Prisma.discussion_board_data_retention_policiesOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_data_retention_policies.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        ...DiscussionBoardDataRetentionPolicyAtSummaryTransformer.select()
          .select,
        dataTypeMappings: {
          select: { id: true },
        },
      },
    }),
    MyGlobal.prisma.discussion_board_data_retention_policies.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardDataRetentionPolicyAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page satisfies number as number,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardDataRetentionPolicy.ISummary;
}
