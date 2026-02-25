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

export async function deleteCommunityPlatformAdminFeatureFlagsFeatureFlagIdEnvironmentsEnvironmentIdDetailsDetailIdConfigurationOverridesOverrideId(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  environmentId: string & tags.Format<"uuid">;
  detailId: string & tags.Format<"uuid">;
  overrideId: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    // Verify feature flag exists
    const featureFlag =
      await MyGlobal.prisma.community_platform_feature_flags.findUniqueOrThrow({
        where: { id: props.featureFlagId },
      });
    // Verify environment exists under this feature flag
    const environment =
      await MyGlobal.prisma.community_platform_feature_flag_environments.findUniqueOrThrow(
        {
          where: {
            id: props.environmentId,
            feature_flag_id: props.featureFlagId,
          },
        },
      );
    // Verify environment detail exists under this environment
    const environmentDetail =
      await MyGlobal.prisma.community_platform_feature_flag_environment_details.findUniqueOrThrow(
        {
          where: {
            id: props.detailId,
            community_platform_feature_flag_id: props.featureFlagId,
            community_platform_feature_flag_environment_id: props.environmentId,
          },
        },
      );
    // Delete the configuration override
    await MyGlobal.prisma.community_platform_feature_flag_environment_detail_configuration_overrides.delete(
      {
        where: {
          id: props.overrideId,
          community_platform_feature_flag_environment_detail_id: props.detailId,
        },
      },
    );
    // Log deletion for audit purposes (implementation would depend on audit system)
    // This is where audit logging would be added
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new HttpException("Configuration override not found", 404);
    }
    throw error;
  }
}
