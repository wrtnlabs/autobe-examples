import { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformConfigurationAtSummaryTransformer {
  export type Payload = Prisma.community_platform_configurationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        config_key: true,
        config_value: true,
        data_type: true,
        scope: true,
        description: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_configurationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformConfiguration.ISummary> {
    return {
      id: input.id,
      config_key: input.config_key,
      data_type: input.data_type,
      scope: input.scope,
      is_active: input.is_active,
    };
  }
}
