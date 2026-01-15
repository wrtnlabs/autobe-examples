import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigHistory";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallConfigHistoryTransformer {
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
        deleted_at: true,
        created_at: true,
        description: true,
        platformConfiguration: true,
        admin: true,
      },
    } satisfies Prisma.shopping_mall_config_historyFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallConfigHistory> {
    return {
      id: input.id,
      config_key: input.change_type,
      old_value: input.old_value satisfies string as string,
      new_value: input.new_value,
      ip_address: "0.0.0.0",
      user_agent: "Unknown User Agent",
      created_at: input.created_at.toISOString(),
      metadata: input.description ? JSON.parse(input.description) : undefined,
    };
  }
}
