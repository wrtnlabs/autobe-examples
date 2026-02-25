import { ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getCommunityPlatformAdminFeatureFlagsFeatureFlagIdEnvironmentsEnvironmentIdDetailsDetailIdConfigurationOverridesOverrideId(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  environmentId: string & tags.Format<"uuid">;
  detailId: string & tags.Format<"uuid">;
  overrideId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride> {
  // Verify hierarchical relationships exist
  const featureFlagEnvironment =
    await MyGlobal.prisma.community_platform_feature_flag_environments.findFirst(
      {
        where: {
          id: props.environmentId,
          feature_flag_id: props.featureFlagId,
        },
      },
    );
  if (!featureFlagEnvironment) {
    throw new HttpException("Feature flag environment hierarchy invalid", 404);
  }
  const featureFlagEnvironmentDetail =
    await MyGlobal.prisma.community_platform_feature_flag_environment_details.findFirst(
      {
        where: {
          id: props.detailId,
          community_platform_feature_flag_environment_id: props.environmentId,
        },
      },
    );
  if (!featureFlagEnvironmentDetail) {
    throw new HttpException("Configuration override hierarchy invalid", 404);
  }
  // Retrieve the specific configuration override
  const override =
    await MyGlobal.prisma.community_platform_feature_flag_environment_detail_configuration_overrides.findUniqueOrThrow(
      {
        where: {
          id: props.overrideId,
          community_platform_feature_flag_environment_detail_id: props.detailId,
        },
        select: {
          id: true,
          config_key: true,
          config_value: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  return {
    id: override.id,
    config_key: override.config_key,
    config_value: override.config_value,
    created_at: override.created_at.toISOString(),
    updated_at: override.updated_at.toISOString(),
    deleted_at: override.deleted_at ? override.deleted_at.toISOString() : null,
  };
}
