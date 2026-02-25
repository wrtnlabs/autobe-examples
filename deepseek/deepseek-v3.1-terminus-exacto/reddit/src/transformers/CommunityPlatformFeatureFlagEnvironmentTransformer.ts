import { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformFeatureFlagAtSummaryTransformer } from "./CommunityPlatformFeatureFlagAtSummaryTransformer";

export namespace CommunityPlatformFeatureFlagEnvironmentTransformer {
  export type Payload =
    Prisma.community_platform_feature_flag_environmentsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        is_enabled: true,
        rollout_percentage: true,
        featureFlag: CommunityPlatformFeatureFlagAtSummaryTransformer.select(),
        flagDetails: true,
        targetingRules: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_feature_flag_environmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformFeatureFlagEnvironment> {
    return {
      id: input.id,
      is_enabled: input.is_enabled,
      rollout_percentage: input.rollout_percentage,
      feature_flag:
        await CommunityPlatformFeatureFlagAtSummaryTransformer.transform(
          input.featureFlag,
        ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
