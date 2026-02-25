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

export async function deleteCommunityPlatformAdminFeatureFlagsFeatureFlagIdEnvironmentsEnvironmentIdDetailsDetailId(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  environmentId: string & tags.Format<"uuid">;
  detailId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the detail record exists and belongs to the specified feature flag and environment
  const detail =
    await MyGlobal.prisma.community_platform_feature_flag_environment_details.findUniqueOrThrow(
      {
        where: {
          id: props.detailId,
          community_platform_feature_flag_id: props.featureFlagId,
          community_platform_feature_flag_environment_id: props.environmentId,
        },
      },
    );
  // Perform hard delete
  await MyGlobal.prisma.community_platform_feature_flag_environment_details.delete(
    {
      where: { id: props.detailId },
    },
  );
}
