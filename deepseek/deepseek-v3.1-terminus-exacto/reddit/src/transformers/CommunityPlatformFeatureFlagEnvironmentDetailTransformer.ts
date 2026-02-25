import { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import { ICommunityPlatformFeatureFlagEnvironmentDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetail";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformFeatureFlagAtSummaryTransformer } from "./CommunityPlatformFeatureFlagAtSummaryTransformer";
import { CommunityPlatformFeatureFlagEnvironmentAtSummaryTransformer } from "./CommunityPlatformFeatureFlagEnvironmentAtSummaryTransformer";

export namespace CommunityPlatformFeatureFlagEnvironmentDetailTransformer {
  export type Payload =
    Prisma.community_platform_feature_flag_environment_detailsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        featureFlag: CommunityPlatformFeatureFlagAtSummaryTransformer.select(),
        environment:
          CommunityPlatformFeatureFlagEnvironmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_feature_flag_environment_detailsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformFeatureFlagEnvironmentDetail> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      featureFlag:
        await CommunityPlatformFeatureFlagAtSummaryTransformer.transform(
          input.featureFlag,
        ),
      environment:
        await CommunityPlatformFeatureFlagEnvironmentAtSummaryTransformer.transform(
          input.environment,
        ),
    };
  }
}
