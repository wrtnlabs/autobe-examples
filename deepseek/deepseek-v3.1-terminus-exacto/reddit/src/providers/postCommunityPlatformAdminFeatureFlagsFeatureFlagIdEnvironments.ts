import { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformFeatureFlagEnvironmentCollector } from "../collectors/CommunityPlatformFeatureFlagEnvironmentCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformFeatureFlagEnvironmentTransformer } from "../transformers/CommunityPlatformFeatureFlagEnvironmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminFeatureFlagsFeatureFlagIdEnvironments(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  body: ICommunityPlatformFeatureFlagEnvironment.ICreate;
}): Promise<ICommunityPlatformFeatureFlagEnvironment> {
  // Verify feature flag exists
  const featureFlag =
    await MyGlobal.prisma.community_platform_feature_flags.findUniqueOrThrow({
      where: { id: props.featureFlagId },
    });
  // Create environment configuration using collector
  const environment =
    await MyGlobal.prisma.community_platform_feature_flag_environments.create({
      data: await CommunityPlatformFeatureFlagEnvironmentCollector.collect({
        body: props.body,
        communityPlatformFeatureFlags: { id: props.featureFlagId },
      }),
      ...CommunityPlatformFeatureFlagEnvironmentTransformer.select(),
    });
  // Transform database result to API response
  return await CommunityPlatformFeatureFlagEnvironmentTransformer.transform(
    environment,
  );
}
