import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
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
        customer: {
          select: {
            id: true,
            email: true,
            created_at: true,
            updated_at: true,
          },
        } satisfies Prisma.shopping_mall_customersFindManyArgs,
        snapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_cart_snapshotsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCartItem> {
    // Note: product and variant require database schema update (add product_variant_id FK)
    // Until then, using inline mock/computed values
    const variant: IShoppingMallProductVariant.ISummary = {
      id: "mock-variant-id",
      sku_code: "mock-sku",
      option_values: "mock-options",
      price_override: null,
      stock_quantity: 0,
      available: false,
    };
    const product: IShoppingMallProduct.ISummary = {
      id: "mock-product-id",
      name: "Mock Product",
      description: "Mock description",
      basePrice: 0,
      category: {
        id: "mock-category-id",
        name: "Mock Category",
        description: null,
        parent: null,
        created_at: toISOStringSafe(new Date()),
      },
      seller: {
        id: input.customer.id,
        email: input.customer.email,
        shop_name: "Mock Shop",
        shop_description: null,
        logo_image: null,
        approval_status: "approved",
        rejection_reason: null,
        status: "active",
        created_at: toISOStringSafe(input.customer.created_at),
        updated_at: toISOStringSafe(input.customer.updated_at),
      },
      imageUrl: null,
      available: false,
      variantCount: 0,
    };
    const price = variant.price_override ?? product.basePrice;
    return {
      id: input.id,
      quantity: input.quantity,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      product: product,
      variant: variant,
      subtotal: price * input.quantity,
    };
  }
}
