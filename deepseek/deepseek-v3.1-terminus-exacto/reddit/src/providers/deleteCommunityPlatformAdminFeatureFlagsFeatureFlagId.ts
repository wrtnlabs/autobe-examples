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

export async function deleteCommunityPlatformAdminFeatureFlagsFeatureFlagId(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the feature flag exists and is not already deleted
  const existingFlag =
    await MyGlobal.prisma.community_platform_feature_flags.findFirst({
      where: {
        id: props.featureFlagId,
        deleted_at: null,
      },
    });
  if (!existingFlag) {
    throw new HttpException("Feature flag not found or already deleted", 404);
  }
  // Perform soft deletion by setting deleted_at timestamp
  await MyGlobal.prisma.community_platform_feature_flags.update({
    where: { id: props.featureFlagId },
    data: {
      deleted_at: new Date().toISOString(),
    },
  });
}
