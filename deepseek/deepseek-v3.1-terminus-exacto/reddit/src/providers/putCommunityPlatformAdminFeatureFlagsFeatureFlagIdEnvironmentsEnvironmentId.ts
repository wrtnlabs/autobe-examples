import { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformFeatureFlagEnvironmentTransformer } from "../transformers/CommunityPlatformFeatureFlagEnvironmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putCommunityPlatformAdminFeatureFlagsFeatureFlagIdEnvironmentsEnvironmentId(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  environmentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformFeatureFlagEnvironment.IUpdate;
}): Promise<ICommunityPlatformFeatureFlagEnvironment> {
  // First, verify the environment exists and belongs to the specified feature flag
  await MyGlobal.prisma.community_platform_feature_flag_environments.findUniqueOrThrow(
    {
      where: {
        id: props.environmentId,
        feature_flag_id: props.featureFlagId,
        deleted_at: null,
      },
    },
  );
  // Validate rollout_percentage is between 0-100 when provided
  if (
    props.body.rollout_percentage !== undefined &&
    props.body.rollout_percentage !== null
  ) {
    if (
      props.body.rollout_percentage < 0 ||
      props.body.rollout_percentage > 100
    ) {
      throw new HttpException(
        "Rollout percentage must be between 0 and 100",
        400,
      );
    }
  }
  // Build update data from the request body
  const updateData: Prisma.community_platform_feature_flag_environmentsUpdateInput =
    {};
  if (props.body.is_enabled !== undefined) {
    updateData.is_enabled = props.body.is_enabled;
  }
  if (props.body.rollout_percentage !== undefined) {
    updateData.rollout_percentage = props.body.rollout_percentage;
  }
  // Always update the updated_at timestamp
  updateData.updated_at = new Date();
  // Perform the update
  await MyGlobal.prisma.community_platform_feature_flag_environments.update({
    where: {
      id: props.environmentId,
      feature_flag_id: props.featureFlagId,
    },
    data: updateData,
  });
  // Retrieve the updated record with transformer selection
  const updated =
    await MyGlobal.prisma.community_platform_feature_flag_environments.findUniqueOrThrow(
      {
        where: {
          id: props.environmentId,
          feature_flag_id: props.featureFlagId,
        },
        ...CommunityPlatformFeatureFlagEnvironmentTransformer.select(),
      },
    );
  // Transform and return
  return await CommunityPlatformFeatureFlagEnvironmentTransformer.transform(
    updated,
  );
}
