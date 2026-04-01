import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCartSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_cart_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        cartItem: { select: { id: true } },
        customer: { select: { id: true } },
        sku_code: true,
        option_values: true,
        price_at_snapshot: true,
        quantity: true,
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_cart_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCartSnapshot> {
    return {
      id: input.id,
      shopping_mall_cart_item_id: input.cartItem.id,
      shopping_mall_customer_id: input.customer.id,
      sku_code: input.sku_code,
      option_values: input.option_values,
      price_at_snapshot: input.price_at_snapshot,
      quantity: input.quantity,
      created_at: input.created_at.toISOString(),
    };
  }
}
