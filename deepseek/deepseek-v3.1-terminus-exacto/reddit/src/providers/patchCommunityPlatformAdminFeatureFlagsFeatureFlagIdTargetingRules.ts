import { ICommunityPlatformFeatureFlagTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagTargetingRule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformFeatureFlagTargetingRuleTransformer } from "../transformers/CommunityPlatformFeatureFlagTargetingRuleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminFeatureFlagsFeatureFlagIdTargetingRules(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  body: ICommunityPlatformFeatureFlagTargetingRule.IUpdate;
}): Promise<ICommunityPlatformFeatureFlagTargetingRule> {
  // Verify the feature flag exists
  await MyGlobal.prisma.community_platform_feature_flags.findUniqueOrThrow({
    where: { id: props.featureFlagId },
  });
  // Validate required fields for creation (since this appears to be a create operation)
  if (
    !props.body.rule_key ||
    !props.body.rule_value ||
    !props.body.rule_operator
  ) {
    throw new HttpException(
      "Rule key, rule value, and rule operator are required",
      400,
    );
  }
  // Check unique constraint - targeting rule with same key+value must not exist
  const existing =
    await MyGlobal.prisma.community_platform_feature_flag_targeting_rules.findUnique(
      {
        where: {
          community_platform_feature_flag_id_rule_key_rule_value: {
            community_platform_feature_flag_id: props.featureFlagId,
            rule_key: props.body.rule_key,
            rule_value: props.body.rule_value,
          },
        },
      },
    );
  if (existing) {
    throw new HttpException(
      "A targeting rule with the same key and value already exists for this feature flag",
      409,
    );
  }
  // Create the targeting rule
  const created =
    await MyGlobal.prisma.community_platform_feature_flag_targeting_rules.create(
      {
        data: {
          id: v4(),
          community_platform_feature_flag_id: props.featureFlagId,
          rule_key: props.body.rule_key,
          rule_value: props.body.rule_value,
          rule_operator: props.body.rule_operator,
          description: props.body.description ?? null,
          is_active: props.body.is_active ?? true,
          priority: props.body.priority ?? 0,
          created_at:
            new Date().toISOString().replace("T", " ").substring(0, 23) + "Z",
          updated_at:
            new Date().toISOString().replace("T", " ").substring(0, 23) + "Z",
          deleted_at: null,
        },
        ...CommunityPlatformFeatureFlagTargetingRuleTransformer.select(),
      },
    );
  return await CommunityPlatformFeatureFlagTargetingRuleTransformer.transform(
    created,
  );
}
