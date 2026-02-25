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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminDataRetentionPolicies(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardDataRetentionPolicy.IRequest;
}): Promise<IPageIDiscussionBoardDataRetentionPolicy.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper type narrowing
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      policy_name: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.compliance_standard !== undefined && {
      compliance_standard:
        props.body.compliance_standard !== null
          ? props.body.compliance_standard
          : undefined,
    }),
    ...(props.body.retention_action !== undefined && {
      retention_action:
        props.body.retention_action !== null
          ? props.body.retention_action
          : undefined,
    }),
    ...(props.body.is_active !== undefined && {
      is_active:
        props.body.is_active !== null ? props.body.is_active : undefined,
    }),
    ...((props.body.retention_period_days_min !== undefined ||
      props.body.retention_period_days_max !== undefined) && {
      retention_period_days: {
        ...(props.body.retention_period_days_min !== undefined &&
          props.body.retention_period_days_min !== null && {
            gte: (props.body.retention_period_days_min ??
              0) satisfies number as number,
          }),
        ...(props.body.retention_period_days_max !== undefined &&
          props.body.retention_period_days_max !== null && {
            lte: (props.body.retention_period_days_max ??
              0) satisfies number as number,
          }),
      },
    }),
  } satisfies Prisma.discussion_board_data_retention_policiesWhereInput;
  // Handle sorting
  const orderByInput = (
    props.body.sort === "policy_name"
      ? { policy_name: "asc" as const }
      : props.body.sort === "updated_at"
        ? { updated_at: "desc" as const }
        : { created_at: "desc" as const }
  ) satisfies Prisma.discussion_board_data_retention_policiesOrderByWithRelationInput;
  // Execute parallel queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_data_retention_policies.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        policy_name: true,
        retention_period_days: true,
        retention_action: true,
        compliance_standard: true,
        is_active: true,
      },
    }),
    MyGlobal.prisma.discussion_board_data_retention_policies.count({
      where: whereInput,
    }),
  ]);
  // Transform results
  const transformedData = data.map(
    (item) =>
      ({
        id: item.id as string & tags.Format<"uuid">,
        policy_name: item.policy_name,
        retention_period_days: item.retention_period_days,
        retention_action: item.retention_action,
        compliance_standard: item.compliance_standard ?? undefined,
        is_active: item.is_active,
      }) satisfies IDiscussionBoardDataRetentionPolicy.ISummary,
  );
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIDiscussionBoardDataRetentionPolicy.ISummary;
}
