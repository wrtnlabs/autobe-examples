import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSystemConfigurationAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_system_configurationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        config_key: true,
        category: true,
        is_enabled: true,
        description: true,
        created_at: true,
        updated_at: true,
        updated_by: true,
        configurationValues: true,
      },
    } satisfies Prisma.shopping_mall_system_configurationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSystemConfiguration.ISummary> {
    return {
      id: input.id,
      config_key: input.config_key,
      category: input.category ?? undefined,
      is_enabled: input.is_enabled,
      description: input.description ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
