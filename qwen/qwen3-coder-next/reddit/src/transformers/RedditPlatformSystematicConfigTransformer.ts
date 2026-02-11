import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformSystematicConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSystematicConfig";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformSystematicConfigTransformer {
  export type Payload = Prisma.reddit_platform_systematic_configsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        config_key: true,
        config_value: true,
        config_type: true,
        description: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.reddit_platform_systematic_configsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformSystematicConfig> {
    return {
      id: input.id,
      config_key: input.config_key,
      config_value: input.config_value,
      config_type: input.config_type,
      description: input.description ?? null,
      is_active: input.is_active,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
