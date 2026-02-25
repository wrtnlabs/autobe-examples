import { ICommunityPlatformFeatureFlagEnvironmentTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentTargetingRule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformFeatureFlagEnvironmentTargetingRuleTransformer } from "../transformers/CommunityPlatformFeatureFlagEnvironmentTargetingRuleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminFeatureFlagsFeatureFlagIdEnvironmentsEnvironmentIdTargetingRulesTargetingRuleId(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  environmentId: string & tags.Format<"uuid">;
  targetingRuleId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformFeatureFlagEnvironmentTargetingRule> {
  // Verify the environment exists and belongs to the specified feature flag
  const environment =
    await MyGlobal.prisma.community_platform_feature_flag_environments.findUniqueOrThrow(
      {
        where: {
          id: props.environmentId,
          deleted_at: null,
        },
      },
    );
  // Additional validation: ensure environment belongs to the specified feature flag
  if (environment.feature_flag_id !== props.featureFlagId) {
    throw new HttpException(
      "Environment does not belong to the specified feature flag",
      400,
    );
  }
  // Query the targeting rule ensuring it belongs to the specified environment and is not soft-deleted
  const targetingRule =
    await MyGlobal.prisma.community_platform_feature_flag_environment_targeting_rules.findUniqueOrThrow(
      {
        where: {
          id: props.targetingRuleId,
          deleted_at: null,
        },
        ...CommunityPlatformFeatureFlagEnvironmentTargetingRuleTransformer.select(),
      },
    );
  // Additional validation: ensure retrieved targeting rule's environment matches the expected one
  if (targetingRule.featureFlagEnvironment.id !== props.environmentId) {
    throw new HttpException(
      "Targeting rule does not belong to the specified environment",
      400,
    );
  }
  return await CommunityPlatformFeatureFlagEnvironmentTargetingRuleTransformer.transform(
    targetingRule,
  );
}
