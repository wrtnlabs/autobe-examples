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
import { CommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverrideTransformer } from "../transformers/CommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverrideTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putCommunityPlatformAdminFeatureFlagsFeatureFlagIdEnvironmentsEnvironmentIdDetailsDetailIdConfigurationOverridesOverrideId(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  environmentId: string & tags.Format<"uuid">;
  detailId: string & tags.Format<"uuid">;
  overrideId: string & tags.Format<"uuid">;
  body: ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.IUpdate;
}): Promise<ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride> {
  // Verify the configuration override exists and belongs to the specified hierarchy
  const existingOverride =
    await MyGlobal.prisma.community_platform_feature_flag_environment_detail_configuration_overrides.findUniqueOrThrow(
      {
        where: {
          id: props.overrideId,
          community_platform_feature_flag_environment_detail_id: props.detailId,
        },
      },
    );
  // Verify the hierarchy matches the path parameters by querying parent entities
  const detail =
    await MyGlobal.prisma.community_platform_feature_flag_environment_details.findUniqueOrThrow(
      {
        where: { id: props.detailId },
      },
    );
  if (
    detail.community_platform_feature_flag_environment_id !==
    props.environmentId
  ) {
    throw new HttpException("Environment ID mismatch", 400);
  }
  const environment =
    await MyGlobal.prisma.community_platform_feature_flag_environments.findUniqueOrThrow(
      {
        where: { id: props.environmentId },
      },
    );
  if (environment.feature_flag_id !== props.featureFlagId) {
    throw new HttpException("Feature flag ID mismatch", 400);
  }
  // Check for config_key uniqueness if config_key is being updated
  if (
    props.body.config_key !== undefined &&
    props.body.config_key !== existingOverride.config_key
  ) {
    const existingKey =
      await MyGlobal.prisma.community_platform_feature_flag_environment_detail_configuration_overrides.findFirst(
        {
          where: {
            community_platform_feature_flag_environment_detail_id:
              props.detailId,
            config_key: props.body.config_key,
            id: { not: props.overrideId },
            deleted_at: null,
          },
        },
      );
    if (existingKey) {
      throw new HttpException(
        "Configuration key already exists for this environment detail",
        400,
      );
    }
  }
  // Prepare update data with conditional field assignment
  const updateData: Prisma.community_platform_feature_flag_environment_detail_configuration_overridesUpdateInput =
    {
      updated_at: new Date(),
    };
  if (props.body.config_key !== undefined) {
    updateData.config_key = props.body.config_key;
  }
  if (props.body.config_value !== undefined) {
    updateData.config_value = props.body.config_value;
  }
  // Update the configuration override
  const updated =
    await MyGlobal.prisma.community_platform_feature_flag_environment_detail_configuration_overrides.update(
      {
        where: { id: props.overrideId },
        data: updateData,
        ...CommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverrideTransformer.select(),
      },
    );
  // Transform and return the updated record
  return await CommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverrideTransformer.transform(
    updated,
  );
}
