import { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import { ICommunityPlatformFeatureFlagEnvironmentDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetail";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformFeatureFlagEnvironmentDetailTransformer } from "../transformers/CommunityPlatformFeatureFlagEnvironmentDetailTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityPlatformAdminFeatureFlagsFeatureFlagIdEnvironmentsEnvironmentIdDetails(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  environmentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformFeatureFlagEnvironmentDetail.IUpdate;
}): Promise<ICommunityPlatformFeatureFlagEnvironmentDetail> {
  // Verify the environment belongs to the specified feature flag
  await MyGlobal.prisma.community_platform_feature_flag_environments.findUniqueOrThrow(
    {
      where: {
        id: props.environmentId,
        featureFlag: { id: props.featureFlagId },
      },
    },
  );
  // Verify the environment details record exists
  await MyGlobal.prisma.community_platform_feature_flag_environment_details.findUniqueOrThrow(
    {
      where: {
        community_platform_feature_flag_id_community_platform_feature_flag_environment_id:
          {
            community_platform_feature_flag_id: props.featureFlagId,
            community_platform_feature_flag_environment_id: props.environmentId,
          },
      },
    },
  );
  // Update the environment details with current timestamp
  const updatedDetails =
    await MyGlobal.prisma.community_platform_feature_flag_environment_details.update(
      {
        where: {
          community_platform_feature_flag_id_community_platform_feature_flag_environment_id:
            {
              community_platform_feature_flag_id: props.featureFlagId,
              community_platform_feature_flag_environment_id:
                props.environmentId,
            },
        },
        data: {
          updated_at: new Date(),
        },
        ...CommunityPlatformFeatureFlagEnvironmentDetailTransformer.select(),
      },
    );
  return await CommunityPlatformFeatureFlagEnvironmentDetailTransformer.transform(
    updatedDetails,
  );
}
