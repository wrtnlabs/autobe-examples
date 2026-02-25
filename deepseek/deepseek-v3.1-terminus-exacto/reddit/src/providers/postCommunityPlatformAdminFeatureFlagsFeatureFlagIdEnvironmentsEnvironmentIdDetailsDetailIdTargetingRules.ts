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

export async function postCommunityPlatformAdminFeatureFlagsFeatureFlagIdEnvironmentsEnvironmentIdDetailsDetailIdTargetingRules(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  environmentId: string & tags.Format<"uuid">;
  detailId: string & tags.Format<"uuid">;
  body: ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate;
}): Promise<ICommunityPlatformFeatureFlagEnvironmentTargetingRule> {
  // Verify the entire hierarchy exists and is valid
  const featureFlag =
    await MyGlobal.prisma.community_platform_feature_flags.findUniqueOrThrow({
      where: { id: props.featureFlagId, deleted_at: null },
    });
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
  const detail =
    await MyGlobal.prisma.community_platform_feature_flag_environment_details.findUniqueOrThrow(
      {
        where: {
          id: props.detailId,
          community_platform_feature_flag_environment_id: props.environmentId,
          // Removed deleted_at as it's not available in WhereUniqueInput for this model
        },
      },
    );
  // Check if rule_key already exists for this environment (unique constraint)
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
      "Targeting rule with this key already exists for the specified environment",
      409,
    );
  }
  // Validate rule_key format (basic validation)
  if (!props.body.rule_key || props.body.rule_key.trim().length === 0) {
    throw new HttpException("Rule key cannot be empty", 400);
  }
  if (!props.body.rule_value || props.body.rule_value.trim().length === 0) {
    throw new HttpException("Rule value cannot be empty", 400);
  }
  // Create the targeting rule
  const targetingRule =
    await MyGlobal.prisma.community_platform_feature_flag_environment_targeting_rules.create(
      {
        data: await CommunityPlatformFeatureFlagEnvironmentTargetingRuleCollector.collect(
          {
            body: props.body,
            featureFlagEnvironment: { id: props.environmentId },
          },
        ),
        ...CommunityPlatformFeatureFlagEnvironmentTargetingRuleTransformer.select(),
      },
    );
  return await CommunityPlatformFeatureFlagEnvironmentTargetingRuleTransformer.transform(
    targetingRule,
  );
}
