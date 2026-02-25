import { ICommunityPlatformFeatureFlagEnvironmentDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetail";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformFeatureFlagEnvironmentDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFeatureFlagEnvironmentDetail";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformFeatureFlagEnvironmentDetailAtSummaryTransformer } from "../transformers/CommunityPlatformFeatureFlagEnvironmentDetailAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminAnalyticsFeatureFlags(props: {
  admin: AdminPayload;
  body: ICommunityPlatformFeatureFlagEnvironmentDetail.IRequest;
}): Promise<IPageICommunityPlatformFeatureFlagEnvironmentDetail.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build complex WHERE conditions for filtering
  const whereInput = {
    AND: [
      // Search filter on feature flag name
      props.body.search
        ? {
            featureFlag: {
              name: {
                contains: props.body.search,
                mode: "insensitive" as const,
              },
            },
          }
        : {},
      // Status filter
      props.body.status
        ? {
            featureFlag: {
              status: props.body.status,
            },
          }
        : {},
      // Flag type filter
      props.body.flag_type
        ? {
            featureFlag: {
              flag_type: props.body.flag_type,
            },
          }
        : {},
      // Date range filter (using string comparison since we can't use Date)
      props.body.created_at_start || props.body.created_at_end
        ? {
            created_at: {
              ...(props.body.created_at_start && {
                gte: props.body.created_at_start,
              }),
              ...(props.body.created_at_end && {
                lte: props.body.created_at_end,
              }),
            },
          }
        : {},
    ].filter((condition) => Object.keys(condition).length > 0),
  } satisfies Prisma.community_platform_feature_flag_environment_detailsWhereInput;
  // Get paginated results using the transformer's select
  const data =
    await MyGlobal.prisma.community_platform_feature_flag_environment_details.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" as const },
        ...CommunityPlatformFeatureFlagEnvironmentDetailAtSummaryTransformer.select(),
      },
    );
  // Get total count for pagination
  const total =
    await MyGlobal.prisma.community_platform_feature_flag_environment_details.count(
      {
        where: whereInput,
      },
    );
  // Transform data using the transformer
  const transformedData = await Promise.all(
    data.map(
      CommunityPlatformFeatureFlagEnvironmentDetailAtSummaryTransformer.transform,
    ),
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
