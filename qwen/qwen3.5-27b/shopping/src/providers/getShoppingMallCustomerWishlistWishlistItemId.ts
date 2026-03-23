import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerAtSummaryTransformer } from "../transformers/ShoppingMallCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerWishlistWishlistItemId(props: {
  customer: CustomerPayload;
  wishlistItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallWishlistItem> {
  const wishlistItem =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findUniqueOrThrow({
      where: {
        id: props.wishlistItemId,
        deleted_at: null,
      },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        shopping_mall_customer_id: true,
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_wishlist_itemsFindUniqueOrThrowArgs);
  if (wishlistItem.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: wishlistItem.id,
    customer: await ShoppingMallCustomerAtSummaryTransformer.transform(
      wishlistItem.customer,
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
    createdAt: toISOStringSafe(wishlistItem.created_at),
    updatedAt: toISOStringSafe(wishlistItem.updated_at),
  };
}
