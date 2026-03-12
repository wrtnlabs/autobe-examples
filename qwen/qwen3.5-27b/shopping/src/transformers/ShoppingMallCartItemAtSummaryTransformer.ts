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

export namespace ShoppingMallCartItemAtSummaryTransformer {
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
      },
    } satisfies Prisma.shopping_mall_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCartItem.ISummary> {
    return {
      id: input.id,
      quantity: input.quantity,
      variant: {
        id: "00000000-0000-0000-0000-000000000000",
        sku_code: "MOCK-SKU",
        option_values: "Mock Option",
        price_override: null,
        stock_quantity: 0,
        available: false,
      },
      product: {
        id: "00000000-0000-0000-0000-000000000000",
        name: "Mock Product",
        description: "Mock Description",
        basePrice: 0,
        category: {
          id: "00000000-0000-0000-0000-000000000000",
          name: "Mock Category",
          description: null,
          parent: null,
          created_at: new Date().toISOString(),
        },
        seller: {
          id: "00000000-0000-0000-0000-000000000000",
          email: "mock@example.com",
          shop_name: "Mock Shop",
          shop_description: null,
          logo_image: null,
          approval_status: "approved",
          rejection_reason: null,
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        imageUrl: null,
        available: false,
        variantCount: 0,
      },
      seller: {
        id: "00000000-0000-0000-0000-000000000000",
        email: "mock@example.com",
        shop_name: "Mock Shop",
        shop_description: null,
        logo_image: null,
        approval_status: "approved",
        rejection_reason: null,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
