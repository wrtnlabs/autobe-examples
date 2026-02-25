import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCartItemOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemOption";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCartItemTransformer {
  export type Payload = Prisma.shopping_mall_cart_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        unit_price: true,
        item_total: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        variant: {
          select: {
            stock_quantity: true,
          },
        },
        productSnapshot: {
          select: {
            id: true,
            product_id: true,
            category_id: true,
            changed_by_id: true,
            version: true,
            changed_at: true,
          },
        },
        variantSnapshot: {
          select: {
            id: true,
            product_variant_id: true,
            changed_by: true,
            version: true,
            sku_code: true,
            price: true,
            previous_sku_code: true,
            previous_price: true,
            changed_at: true,
            created_at: true,
            updated_at: true,
          },
        },
        customer: {
          select: {
            id: true,
            email: true,
          },
        },
        seller: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCartItem> {
    return {
      product_name: "", // Cannot be mapped — schema has no product.name
      sku_code: input.variantSnapshot.sku_code,
      option_values: [], // Cannot be mapped — schema has no options field
      price:
        input.variantSnapshot.price !== null ? input.variantSnapshot.price : 0, // Cannot fallback to base_price — not in schema
      quantity: input.quantity,
      subtotal: input.quantity * input.unit_price,
      in_stock: input.variant.stock_quantity > 0,
      image_url: "", // Cannot be mapped — schema has no image path
    };
  }
}
