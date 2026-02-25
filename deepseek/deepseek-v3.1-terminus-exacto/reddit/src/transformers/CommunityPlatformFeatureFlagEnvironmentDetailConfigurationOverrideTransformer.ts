import { ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverrideTransformer {
  export type Payload =
    Prisma.community_platform_feature_flag_environment_detail_configuration_overridesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        config_key: true,
        config_value: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        featureFlagEnvironmentDetail: true,
      },
    } satisfies Prisma.community_platform_feature_flag_environment_detail_configuration_overridesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride> {
    return {
      id: input.id,
      config_key: input.config_key,
      config_value: input.config_value,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
