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

export async function deleteCommunityPlatformAdminFeatureFlagsFeatureFlagIdEnvironmentsEnvironmentIdTargetingRulesTargetingRuleId(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  environmentId: string & tags.Format<"uuid">;
  targetingRuleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Admin authorization is implicitly handled by the decorator
  // The admin payload is already validated by the authorization middleware
  const currentTimestamp = new Date().toISOString();
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Verify feature flag exists and is not deleted
    const featureFlag = await tx.community_platform_feature_flags.findFirst({
      where: {
        id: props.featureFlagId,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (!featureFlag) {
      throw new HttpException("Feature flag not found or already deleted", 404);
    }
    // Verify environment exists, belongs to feature flag, and is not deleted
    const environment =
      await tx.community_platform_feature_flag_environments.findFirst({
        where: {
          id: props.environmentId,
          feature_flag_id: props.featureFlagId,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (!environment) {
      throw new HttpException(
        "Environment not found or does not belong to the specified feature flag",
        404,
      );
    }
    // Verify targeting rule exists, belongs to environment, and is not deleted
    const targetingRule =
      await tx.community_platform_feature_flag_environment_targeting_rules.findFirst(
        {
          where: {
            id: props.targetingRuleId,
            community_platform_feature_flag_environment_id: props.environmentId,
            deleted_at: null,
          },
          select: { id: true },
        },
      );
    if (!targetingRule) {
      throw new HttpException(
        "Targeting rule not found or does not belong to the specified environment",
        404,
      );
    }
    // Perform soft deletion by setting deleted_at timestamp
    await tx.community_platform_feature_flag_environment_targeting_rules.update(
      {
        where: { id: props.targetingRuleId },
        data: {
          deleted_at: currentTimestamp,
          updated_at: currentTimestamp,
        },
      },
    );
  });
}
