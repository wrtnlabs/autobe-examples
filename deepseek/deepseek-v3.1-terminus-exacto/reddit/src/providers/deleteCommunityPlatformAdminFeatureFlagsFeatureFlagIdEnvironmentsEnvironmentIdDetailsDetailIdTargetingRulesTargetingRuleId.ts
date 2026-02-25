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

export async function deleteCommunityPlatformAdminFeatureFlagsFeatureFlagIdEnvironmentsEnvironmentIdDetailsDetailIdTargetingRulesTargetingRuleId(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  environmentId: string & tags.Format<"uuid">;
  detailId: string & tags.Format<"uuid">;
  targetingRuleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify feature flag exists
  await MyGlobal.prisma.community_platform_feature_flags.findUniqueOrThrow({
    where: { id: props.featureFlagId },
  });
  // Verify environment exists and belongs to feature flag
  await MyGlobal.prisma.community_platform_feature_flag_environments.findUniqueOrThrow(
    {
      where: {
        id: props.environmentId,
        feature_flag_id: props.featureFlagId,
      },
    },
  );
  // Verify environment detail exists and belongs to both feature flag and environment
  await MyGlobal.prisma.community_platform_feature_flag_environment_details.findUniqueOrThrow(
    {
      where: {
        id: props.detailId,
        community_platform_feature_flag_id: props.featureFlagId,
        community_platform_feature_flag_environment_id: props.environmentId,
      },
    },
  );
  // Delete the targeting rule - according to schema, targeting rules belong to environments directly
  await MyGlobal.prisma.community_platform_feature_flag_environment_targeting_rules.delete(
    {
      where: {
        id: props.targetingRuleId,
        community_platform_feature_flag_environment_id: props.environmentId,
      },
    },
  );
}
