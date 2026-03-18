import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCartTransformer {
  export type Payload = Prisma.shopping_mall_cartsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shopping_mall_member_id: true,
        warning_inventory_insufficient: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: { id: true },
        },
        cartItems: {
          select: { id: true },
        },
      },
    } satisfies Prisma.shopping_mall_cartsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IShoppingMallCart> {
    return {
      id: input.id,
      shopping_mall_member_id: input.shopping_mall_member_id,
      warning_inventory_insufficient: input.warning_inventory_insufficient,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      items: [] as unknown as IShoppingMallCart["items"],
    };
  }
}
