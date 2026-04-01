import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

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
        deleted_at: true,
        customer: {
          select: {
            id: true,
            email: true,
            display_name: true,
            phone_number: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.shopping_mall_customersFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_wishlist_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallWishlistItem> {
    const customer: IShoppingMallCustomer.ISummary = {
      id: input.customer.id,
      email: input.customer.email,
      display_name: input.customer.display_name,
      phone_number: input.customer.phone_number ?? null,
      status: input.customer.status,
      created_at: input.customer.created_at.toISOString(),
      updated_at: input.customer.updated_at.toISOString(),
      deleted_at: input.customer.deleted_at?.toISOString() ?? null,
    };
    const product: IShoppingMallProduct.ISummary = {
      id: "00000000-0000-0000-0000-000000000000",
      name: "",
      description: "",
      basePrice: 0,
      category: {
        id: "00000000-0000-0000-0000-000000000000",
        name: "",
        description: null,
        parent: null,
        created_at: new Date().toISOString(),
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      imageUrl: null,
      available: false,
      variantCount: 0,
    };
    const seller: IShoppingMallSeller.ISummary = {
      id: "00000000-0000-0000-0000-000000000000",
      email: "",
      shop_name: "",
      shop_description: null,
      logo_image: null,
      approval_status: "pending",
      rejection_reason: null,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return {
      id: input.id,
      customer,
      product,
      seller,
      averageRating: 0,
      reviewCount: 0,
      isInStock: false,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
