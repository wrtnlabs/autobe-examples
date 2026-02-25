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
import { CommunityPlatformFeatureFlagEnvironmentDetailCollector } from "../collectors/CommunityPlatformFeatureFlagEnvironmentDetailCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformFeatureFlagEnvironmentDetailTransformer } from "../transformers/CommunityPlatformFeatureFlagEnvironmentDetailTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminFeatureFlagsFeatureFlagIdEnvironmentsEnvironmentIdDetails(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  environmentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformFeatureFlagEnvironmentDetail.ICreate;
}): Promise<ICommunityPlatformFeatureFlagEnvironmentDetail> {
  // Validate that feature flag exists
  const featureFlag =
    await MyGlobal.prisma.community_platform_feature_flags.findUniqueOrThrow({
      where: { id: props.featureFlagId },
    });
  // Validate that environment exists
  const environment =
    await MyGlobal.prisma.community_platform_feature_flag_environments.findUniqueOrThrow(
      {
        where: { id: props.environmentId },
      },
    );
  try {
    // Create the environment detail record
    const detail =
      await MyGlobal.prisma.community_platform_feature_flag_environment_details.create(
        {
          data: await CommunityPlatformFeatureFlagEnvironmentDetailCollector.collect(
            {
              body: props.body,
              featureFlag: { id: featureFlag.id },
              environment: { id: environment.id },
            },
          ),
          ...CommunityPlatformFeatureFlagEnvironmentDetailTransformer.select(),
        },
      );
    return await CommunityPlatformFeatureFlagEnvironmentDetailTransformer.transform(
      detail,
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "Feature flag environment detail already exists for this combination",
        409,
      );
    }
    throw error;
  }
}
