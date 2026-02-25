import { ICommunityPlatformFeatureFlagEnvironmentTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentTargetingRule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformFeatureFlagEnvironmentTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFeatureFlagEnvironmentTargetingRule";
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

export async function patchCommunityPlatformAdminFeatureFlagsFeatureFlagIdEnvironmentsEnvironmentIdTargetingRules(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  environmentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformFeatureFlagEnvironmentTargetingRule.IRequest;
}): Promise<IPageICommunityPlatformFeatureFlagEnvironmentTargetingRule.ISummary> {
  // Validate feature flag environment exists
  const environment =
    await MyGlobal.prisma.community_platform_feature_flag_environments.findFirst(
      {
        where: {
          id: props.environmentId,
          feature_flag_id: props.featureFlagId,
          deleted_at: null,
        },
      },
    );
  if (!environment) {
    throw new HttpException("Feature flag environment not found", 404);
  }
  // Build WHERE conditions with proper date handling
  const whereInput = {
    community_platform_feature_flag_environment_id: props.environmentId,
    ...(props.body.include_deleted !== true && { deleted_at: null }),
    ...(props.body.search && {
      OR: [
        {
          rule_key: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
        {
          rule_value: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
    ...(props.body.rule_key && { rule_key: props.body.rule_key }),
    ...(props.body.rule_value && { rule_value: props.body.rule_value }),
    ...(props.body.created_from && {
      created_at: { gte: props.body.created_from },
    }),
    ...(props.body.created_to && {
      created_at: { lte: props.body.created_to },
    }),
    ...(props.body.updated_from && {
      updated_at: { gte: props.body.updated_from },
    }),
    ...(props.body.updated_to && {
      updated_at: { lte: props.body.updated_to },
    }),
  } satisfies Prisma.community_platform_feature_flag_environment_targeting_rulesWhereInput;
  // Pagination setup
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Query data first
  const data =
    await MyGlobal.prisma.community_platform_feature_flag_environment_targeting_rules.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      },
    );
  // Then count total records
  const total =
    await MyGlobal.prisma.community_platform_feature_flag_environment_targeting_rules.count(
      {
        where: whereInput,
      },
    );
  // Transform to response DTO
  const transformedData = data.map((rule) => ({
    id: rule.id as string & tags.Format<"uuid">,
    rule_key: rule.rule_key,
    rule_value: rule.rule_value,
    created_at: rule.created_at.toISOString() as string &
      tags.Format<"date-time">,
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
