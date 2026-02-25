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

export async function deleteCommunityPlatformAdminFeatureFlagsFeatureFlagIdEnvironmentsEnvironmentId(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  environmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Validate that the feature flag exists
  const featureFlag =
    await MyGlobal.prisma.community_platform_feature_flags.findFirst({
      where: { id: props.featureFlagId, deleted_at: null },
    });
  if (!featureFlag) {
    throw new HttpException("Feature flag not found", 404);
  }
  // Validate that the environment exists and belongs to the specified feature flag
  const environment =
    await MyGlobal.prisma.community_platform_feature_flag_environments.findFirst(
      {
        where: {
          id: props.environmentId,
          feature_flag_id: props.featureFlagId,
          deleted_at: null,
        },
      },
    );
  if (!environment) {
    throw new HttpException("Environment not found", 404);
  }
  // Perform soft delete on the environment record using current ISO timestamp
  await MyGlobal.prisma.community_platform_feature_flag_environments.update({
    where: { id: props.environmentId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  // Cascade deletion for related environment details is handled automatically by database cascade constraints
  // The database schema shows onDelete: Cascade for the relation to community_platform_feature_flag_environment_details
}
