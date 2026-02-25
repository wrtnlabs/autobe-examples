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
export async function patchCommunityPlatformAdminFeatureFlagsFeatureFlagIdEnvironmentsEnvironmentIdDetailsDetailIdConfigurationOverrides(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  environmentId: string & tags.Format<"uuid">;
  detailId: string & tags.Format<"uuid">;
  body: ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.IUpdate;
}): Promise<ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride> {
  // Validate hierarchical relationships through separate queries
  const detailExists =
    await MyGlobal.prisma.community_platform_feature_flag_environment_details.findFirst(
      {
        where: { id: props.detailId },
        select: { feature_flag_environment_id: true },
      },
    );
  if (
    !detailExists ||
    detailExists.feature_flag_environment_id !== props.environmentId
  ) {
    throw new HttpException(
      "Invalid feature flag environment detail hierarchy",
      404,
    );
  }
  const environmentExists =
    await MyGlobal.prisma.community_platform_feature_flag_environments.findFirst(
      {
        where: {
          id: props.environmentId,
          feature_flag_id: props.featureFlagId,
        },
        select: { id: true },
      },
    );
  if (!environmentExists) {
    throw new HttpException("Invalid feature flag environment hierarchy", 404);
  }
  const featureFlagExists =
    await MyGlobal.prisma.community_platform_feature_flags.findFirst({
      where: {
        id: props.featureFlagId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!featureFlagExists) {
    throw new HttpException("Feature flag not found", 404);
  }
  // Find the existing configuration override
  const existingOverride =
    await MyGlobal.prisma.community_platform_feature_flag_environment_detail_configuration_overrides.findFirst(
      {
        where: {
          community_platform_feature_flag_environment_detail_id: props.detailId,
          deleted_at: null,
        },
      },
    );
  if (!existingOverride) {
    throw new HttpException("Configuration override not found", 404);
  }
  // Check for unique constraint violation if config_key is being updated
  if (
    props.body.config_key !== undefined &&
    props.body.config_key !== existingOverride.config_key
  ) {
    const existingWithSameKey =
      await MyGlobal.prisma.community_platform_feature_flag_environment_detail_configuration_overrides.findFirst(
        {
          where: {
            community_platform_feature_flag_environment_detail_id:
              props.detailId,
            config_key: props.body.config_key,
            deleted_at: null,
            id: { not: existingOverride.id },
          },
        },
      );
    if (existingWithSameKey) {
      throw new HttpException(
        "Configuration key already exists for this detail",
        400,
      );
    }
  }
  // Prepare update data
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
  // Perform the update
  const updated =
    await MyGlobal.prisma.community_platform_feature_flag_environment_detail_configuration_overrides.update(
      {
        where: { id: existingOverride.id },
        data: updateData,
        ...CommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverrideTransformer.select(),
      },
    );
  return await CommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverrideTransformer.transform(
    updated,
  );
}
