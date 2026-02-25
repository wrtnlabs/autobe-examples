import { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformFeatureFlagTransformer {
  export type Payload = Prisma.community_platform_feature_flagsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        flag_type: true,
        status: true,
        boolean_value: true,
        percentage_value: true,
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
  ): Promise<ICommunityPlatformFeatureFlag> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      flag_type: input.flag_type as "boolean" | "percentage" | "user_specific",
      status: input.status as "active" | "inactive" | "archived",
      boolean_value: input.boolean_value,
      percentage_value: input.percentage_value,
      rollout_started_at: input.rollout_started_at?.toISOString() ?? null,
      rollout_completed_at: input.rollout_completed_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
