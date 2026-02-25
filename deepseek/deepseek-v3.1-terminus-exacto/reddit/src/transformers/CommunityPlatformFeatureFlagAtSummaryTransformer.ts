import { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformFeatureFlagAtSummaryTransformer {
  export type Payload = Prisma.community_platform_feature_flagsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        flag_type: true,
        status: true,
        boolean_value: true,
        percentage_value: true,
        description: true,
        rollout_started_at: true,
        rollout_completed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        targetingRules: true,
        environmentConfigurations: true,
        environmentDetails: true,
      },
    } satisfies Prisma.community_platform_feature_flagsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformFeatureFlag.ISummary> {
    return {
      id: input.id,
      name: input.name,
      flag_type: typia.assert<"boolean" | "percentage" | "user_specific">(
        input.flag_type,
      ),
      status: typia.assert<"active" | "inactive" | "archived">(input.status),
      boolean_value: input.boolean_value,
      percentage_value: input.percentage_value,
    };
  }
}
