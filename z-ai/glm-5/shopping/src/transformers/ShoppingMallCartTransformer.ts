import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCartItemTransformer } from "./ShoppingMallCartItemTransformer";

export namespace ShoppingMallCartTransformer {
  export type Payload = Prisma.shopping_mall_cartsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        customer: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_customersFindManyArgs,
        items: ShoppingMallCartItemTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_cartsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IShoppingMallCart> {
    const items = await ArrayUtil.asyncMap(
      input.items,
      ShoppingMallCartItemTransformer.transform,
    );
    return {
      id: input.id,
      items,
      total_price: items.reduce(
        (sum, item) => sum + item.quantity * (item.variant.price ?? 0),
        0,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
