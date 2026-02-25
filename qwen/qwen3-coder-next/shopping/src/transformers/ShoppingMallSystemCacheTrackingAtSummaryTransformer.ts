import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallSystemCacheTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemCacheTracking";
import { IShoppingMallSystemReferenceData } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemReferenceData";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdminAtSummaryTransformer } from "./ShoppingMallAdminAtSummaryTransformer";
import { ShoppingMallSystemReferenceDataAtSummaryTransformer } from "./ShoppingMallSystemReferenceDataAtSummaryTransformer";

export namespace ShoppingMallSystemCacheTrackingAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_system_cache_trackingsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        cache_key_pattern: true,
        description: true,
        invalidated_at: true,
        cacheTable:
          ShoppingMallSystemReferenceDataAtSummaryTransformer.select(),
        admin: ShoppingMallAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_system_cache_trackingsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSystemCacheTracking.ISummary> {
    return {
      id: input.id,
      cache_key_pattern: input.cache_key_pattern,
      description: input.description,
      invalidated_at: input.invalidated_at.toISOString(),
      table_name:
        await ShoppingMallSystemReferenceDataAtSummaryTransformer.transform(
          input.cacheTable,
        ),
      admin: input.admin
        ? await ShoppingMallAdminAtSummaryTransformer.transform(input.admin)
        : null,
    };
  }
}
