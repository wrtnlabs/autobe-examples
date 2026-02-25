import { ICommunityPlatformFeatureFlagEnvironmentDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetail";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformFeatureFlagEnvironmentDetailAtSummaryTransformer {
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
        featureFlag: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_feature_flagsFindManyArgs,
        environment: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_feature_flag_environmentsFindManyArgs,
        targetingRules: true,
        configurationOverrides: true,
      },
    } satisfies Prisma.community_platform_feature_flag_environment_detailsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformFeatureFlagEnvironmentDetail.ISummary> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      community_platform_feature_flag_id: input.featureFlag.id,
      community_platform_feature_flag_environment_id: input.environment.id,
    };
  }
}
