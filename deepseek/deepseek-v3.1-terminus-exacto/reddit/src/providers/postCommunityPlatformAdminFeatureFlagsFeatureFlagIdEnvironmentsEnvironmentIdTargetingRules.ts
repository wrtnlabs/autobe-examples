import { ICommunityPlatformFeatureFlagEnvironmentTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentTargetingRule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformFeatureFlagEnvironmentTargetingRuleCollector } from "../collectors/CommunityPlatformFeatureFlagEnvironmentTargetingRuleCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformFeatureFlagEnvironmentTargetingRuleTransformer } from "../transformers/CommunityPlatformFeatureFlagEnvironmentTargetingRuleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminFeatureFlagsFeatureFlagIdEnvironmentsEnvironmentIdTargetingRules(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  environmentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate;
}): Promise<ICommunityPlatformFeatureFlagEnvironmentTargetingRule> {
  // Validate feature flag exists
  const featureFlag =
    await MyGlobal.prisma.community_platform_feature_flags.findUniqueOrThrow({
      where: { id: props.featureFlagId, deleted_at: null },
    });
  // Validate environment exists and belongs to the feature flag
  const environment =
    await MyGlobal.prisma.community_platform_feature_flag_environments.findUniqueOrThrow(
      {
        where: {
          id: props.environmentId,
          feature_flag_id: props.featureFlagId,
          deleted_at: null,
        },
      },
    );
  // Check for existing rule with same key in the same environment
  const existingRule =
    await MyGlobal.prisma.community_platform_feature_flag_environment_targeting_rules.findFirst(
      {
        where: {
          community_platform_feature_flag_environment_id: props.environmentId,
          rule_key: props.body.rule_key,
          deleted_at: null,
        },
      },
    );
  if (existingRule) {
    throw new HttpException(
      "Targeting rule with this key already exists for this environment",
      409,
    );
  }
  // Create the targeting rule using the Collector
  const targetingRule =
    await MyGlobal.prisma.community_platform_feature_flag_environment_targeting_rules.create(
      {
        data: await CommunityPlatformFeatureFlagEnvironmentTargetingRuleCollector.collect(
          {
            body: props.body,
            featureFlagEnvironment: environment,
          },
        ),
        ...CommunityPlatformFeatureFlagEnvironmentTargetingRuleTransformer.select(),
      },
    );
  // Transform and return the result
  return await CommunityPlatformFeatureFlagEnvironmentTargetingRuleTransformer.transform(
    targetingRule,
  );
}
