import { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceCacheConfigurationTransformer {
  export type Payload = Prisma.ecommerce_cache_configurationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        cache_key: true,
        cache_type: true,
        is_active: true,
        priority: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_cache_configurationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCacheConfiguration> {
    return {
      id: input.id,
      cache_key: input.cache_key,
      cache_type: input.cache_type,
      is_active: input.is_active,
      priority: input.priority,
      created_at: input.created_at.toISOString(),
    };
  }
}
