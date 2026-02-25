import { ICommunityPlatformFeatureFlagTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagTargetingRule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformFeatureFlagTargetingRuleCollector } from "../collectors/CommunityPlatformFeatureFlagTargetingRuleCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformFeatureFlagTargetingRuleTransformer } from "../transformers/CommunityPlatformFeatureFlagTargetingRuleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminFeatureFlagsFeatureFlagIdTargetingRules(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  body: ICommunityPlatformFeatureFlagTargetingRule.ICreate;
}): Promise<ICommunityPlatformFeatureFlagTargetingRule> {
  // Validate required fields
  if (!props.body.rule_key?.trim()) {
    throw new HttpException("Rule key is required", 400);
  }
  if (!props.body.rule_value?.trim()) {
    throw new HttpException("Rule value is required", 400);
  }
  // Verify feature flag exists and is active
  const featureFlag =
    await MyGlobal.prisma.community_platform_feature_flags.findUniqueOrThrow({
      where: {
        id: props.featureFlagId,
      },
    });
  // Additional check for active and non-deleted feature flag
  if (featureFlag.deleted_at !== null || featureFlag.status !== "active") {
    throw new HttpException("Feature flag not found or inactive", 404);
  }
  // Check for existing targeting rule with same key+value combination
  const existingRule =
    await MyGlobal.prisma.community_platform_feature_flag_targeting_rules.findFirst(
      {
        where: {
          community_platform_feature_flag_id: props.featureFlagId,
          rule_key: props.body.rule_key,
          rule_value: props.body.rule_value,
          deleted_at: null,
        },
      },
    );
  if (existingRule) {
    throw new HttpException(
      "Targeting rule with this key-value combination already exists for this feature flag",
      409,
    );
  }
  // Create the targeting rule using collector
  const targetingRule =
    await MyGlobal.prisma.community_platform_feature_flag_targeting_rules.create(
      {
        data: await CommunityPlatformFeatureFlagTargetingRuleCollector.collect({
          body: props.body,
          communityPlatformFeatureFlags: featureFlag,
        }),
        ...CommunityPlatformFeatureFlagTargetingRuleTransformer.select(),
      },
    );
  // Transform and return the created entity
  return await CommunityPlatformFeatureFlagTargetingRuleTransformer.transform(
    targetingRule,
  );
}
