import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigHistory";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallConfigHistoryAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_config_historyGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        change_type: true,
        old_value: true,
        new_value: true,
        description: true,
        created_at: true,
        deleted_at: true,
        platformConfiguration: true,
        admin: true,
      },
    } satisfies Prisma.shopping_mall_config_historyFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallConfigHistory.ISummary> {
    return {
      id: input.id,
      timestamp: input.created_at.toISOString(),
    };
  }
}
