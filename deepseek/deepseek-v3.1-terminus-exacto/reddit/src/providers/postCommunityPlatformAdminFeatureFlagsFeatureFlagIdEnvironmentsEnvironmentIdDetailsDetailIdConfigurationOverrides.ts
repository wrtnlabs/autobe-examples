import { ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverrideCollector } from "../collectors/CommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverrideCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverrideTransformer } from "../transformers/CommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverrideTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminFeatureFlagsFeatureFlagIdEnvironmentsEnvironmentIdDetailsDetailIdConfigurationOverrides(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  environmentId: string & tags.Format<"uuid">;
  detailId: string & tags.Format<"uuid">;
  body: ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.ICreate;
}): Promise<ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride> {
  // Validate parent feature flag exists
  await MyGlobal.prisma.community_platform_feature_flags.findUniqueOrThrow({
    where: { id: props.featureFlagId },
  });
  // Validate parent environment exists with correct feature flag relationship
  const environment =
    await MyGlobal.prisma.community_platform_feature_flag_environments.findUniqueOrThrow(
      {
        where: { id: props.environmentId },
      },
    );
  // Manually verify the relationship
  if (environment.feature_flag_id !== props.featureFlagId) {
    throw new HttpException(
      "Environment does not belong to the specified feature flag",
      404,
    );
  }
  // Validate parent detail exists with correct environment relationship
  const detail =
    await MyGlobal.prisma.community_platform_feature_flag_environment_details.findUniqueOrThrow(
      {
        where: {
          id: props.detailId,
          community_platform_feature_flag_environment_id: props.environmentId,
        },
        select: {
          id: true,
          community_platform_feature_flag_environment_id: true,
        },
      },
    );
  // Create configuration override using Collector
  const created =
    await MyGlobal.prisma.community_platform_feature_flag_environment_detail_configuration_overrides.create(
      {
        data: await CommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverrideCollector.collect(
          {
            body: props.body,
            featureFlagEnvironmentDetail: { id: detail.id },
          },
        ),
        ...CommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverrideTransformer.select(),
      },
    );
  // Transform and return the created entity
  return await CommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverrideTransformer.transform(
    created,
  );
}
