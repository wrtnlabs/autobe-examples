import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCartItem> {
    return {
      id: input.id,
      quantity: input.quantity,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      product: {
        id: "00000000-0000-0000-0000-000000000000",
        name: "",
        description: "",
        basePrice: 0,
        category: {
          id: "00000000-0000-0000-0000-000000000000",
          name: "",
          description: null,
          parent: null,
          created_at: toISOStringSafe(new Date()),
        },
        seller: {
          id: "00000000-0000-0000-0000-000000000000",
          email: "",
          shop_name: "",
          shop_description: null,
          logo_image: null,
          approval_status: "pending",
          rejection_reason: null,
          status: "active",
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
        imageUrl: null,
        available: false,
        variantCount: 0,
      } satisfies IShoppingMallProduct.ISummary,
      variant: {
        id: "00000000-0000-0000-0000-000000000000",
        sku_code: "",
        option_values: "",
        price_override: null,
        stock_quantity: 0,
        available: false,
      } satisfies IShoppingMallProductVariant.ISummary,
      subtotal: 0,
    };
  }
}
