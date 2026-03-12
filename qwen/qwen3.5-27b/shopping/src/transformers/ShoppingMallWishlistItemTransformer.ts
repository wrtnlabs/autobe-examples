import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCustomerAtSummaryTransformer } from "./ShoppingMallCustomerAtSummaryTransformer";

export namespace ShoppingMallWishlistItemTransformer {
  export type Payload = Prisma.shopping_mall_wishlist_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_wishlist_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallWishlistItem> {
    return {
      id: input.id,
      customer: await ShoppingMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
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
      } satisfies IShoppingMallSeller.ISummary,
      averageRating: 0,
      reviewCount: 0,
      isInStock: false,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
    };
  }
}
