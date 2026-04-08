import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderItemSnapshotAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_order_item_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        product_name: true,
        variant_price: true,
        seller_shop_name: true,
        seller_logo_url: true,
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_order_item_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItemSnapshot.ISummary> {
    return {
      id: input.id,
      product_name: input.product_name,
      variant_price: input.variant_price,
      seller_shop_name: input.seller_shop_name,
      seller_logo_url: input.seller_logo_url ?? null,
      created_at: input.created_at.toISOString(),
    } satisfies IShoppingMallOrderItemSnapshot.ISummary;
  }
}
