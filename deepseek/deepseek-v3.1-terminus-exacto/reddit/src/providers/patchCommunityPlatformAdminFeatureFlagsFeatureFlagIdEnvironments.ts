import { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFeatureFlagEnvironment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformFeatureFlagEnvironmentAtSummaryTransformer } from "../transformers/CommunityPlatformFeatureFlagEnvironmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminFeatureFlagsFeatureFlagIdEnvironments(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  body: ICommunityPlatformFeatureFlagEnvironment.IRequest;
}): Promise<IPageICommunityPlatformFeatureFlagEnvironment.ISummary> {
  // Validate feature flag exists
  await MyGlobal.prisma.community_platform_feature_flags.findUniqueOrThrow({
    where: {
      id: props.featureFlagId,
      deleted_at: null,
    },
  });
  // Build WHERE clause with filtering - filter out null/undefined values
  const page = Math.max(props.body.page ?? 1, 1);
  const limit = Math.min(Math.max(props.body.limit ?? 100, 1), 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.community_platform_feature_flag_environmentsWhereInput =
    {
      feature_flag_id: props.featureFlagId,
      deleted_at: null,
      ...(props.body.is_enabled !== undefined &&
        props.body.is_enabled !== null && {
          is_enabled: props.body.is_enabled,
        }),
      ...(props.body.rollout_percentage !== undefined &&
        props.body.rollout_percentage !== null && {
          rollout_percentage: props.body.rollout_percentage,
        }),
    };
  // Execute update for matching records - filter out null/undefined values
  await MyGlobal.prisma.community_platform_feature_flag_environments.updateMany(
    {
      where: whereInput,
      data: {
        updated_at: new Date(),
        ...(props.body.is_enabled !== undefined &&
          props.body.is_enabled !== null && {
            is_enabled: props.body.is_enabled,
          }),
        ...(props.body.rollout_percentage !== undefined &&
          props.body.rollout_percentage !== null && {
            rollout_percentage: props.body.rollout_percentage,
          }),
      },
    },
  );
  // Retrieve updated records with pagination
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_feature_flag_environments.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformFeatureFlagEnvironmentAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_feature_flag_environments.count({
      where: whereInput,
    }),
  ]);
  // Transform data using existing transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformFeatureFlagEnvironmentAtSummaryTransformer.transform,
  );
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
