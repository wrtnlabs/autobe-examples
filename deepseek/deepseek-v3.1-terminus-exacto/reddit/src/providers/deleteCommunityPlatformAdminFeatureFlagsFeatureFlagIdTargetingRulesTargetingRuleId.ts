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

export async function deleteCommunityPlatformAdminFeatureFlagsFeatureFlagIdTargetingRulesTargetingRuleId(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  targetingRuleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the targeting rule exists and belongs to the specified feature flag
  const targetingRule =
    await MyGlobal.prisma.community_platform_feature_flag_targeting_rules.findUniqueOrThrow(
      {
        where: {
          id: props.targetingRuleId,
          community_platform_feature_flag_id: props.featureFlagId,
          deleted_at: null,
        },
      },
    );
  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.community_platform_feature_flag_targeting_rules.update({
    where: {
      id: props.targetingRuleId,
    },
    data: {
      deleted_at: new Date().toISOString(),
    },
  });
}
