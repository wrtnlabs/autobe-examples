import { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import { ICommunityPlatformFeatureFlagEnvironmentDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetail";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformFeatureFlagEnvironmentDetailTransformer } from "../transformers/CommunityPlatformFeatureFlagEnvironmentDetailTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminFeatureFlagsFeatureFlagIdEnvironmentsEnvironmentIdDetailsDetailId(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  environmentId: string & tags.Format<"uuid">;
  detailId: string & tags.Format<"uuid">;
  body: ICommunityPlatformFeatureFlagEnvironmentDetail.IUpdate;
}): Promise<ICommunityPlatformFeatureFlagEnvironmentDetail> {
  // Since body.IUpdate is empty, only update the timestamp to "touch" the record
  // First verify the referenced entities exist
  await MyGlobal.prisma.community_platform_feature_flags.findUniqueOrThrow({
    where: { id: props.featureFlagId },
  });
  await MyGlobal.prisma.community_platform_feature_flag_environments.findUniqueOrThrow(
    {
      where: { id: props.environmentId },
    },
  );
  // Convert current timestamp to ISO string that matches string & tags.Format<'date-time'>
  // Use toISOStringSafe utility for consistent formatting
  const currentTimestamp = toISOStringSafe(new Date());
  // Perform atomic update and return with transformer selection
  const updatedDetail =
    await MyGlobal.prisma.community_platform_feature_flag_environment_details.update(
      {
        where: {
          id: props.detailId,
          community_platform_feature_flag_id: props.featureFlagId,
          community_platform_feature_flag_environment_id: props.environmentId,
        },
        data: {
          updated_at: currentTimestamp,
        },
        ...CommunityPlatformFeatureFlagEnvironmentDetailTransformer.select(),
      },
    );
  return await CommunityPlatformFeatureFlagEnvironmentDetailTransformer.transform(
    updatedDetail,
  );
}
