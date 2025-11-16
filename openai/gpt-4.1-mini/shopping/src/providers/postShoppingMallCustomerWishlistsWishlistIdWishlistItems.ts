import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { IShoppingMallWishlistItemOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItemOptions";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerWishlistsWishlistIdWishlistItems(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlistItem.ICreate;
}): Promise<IShoppingMallWishlistItem> {
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: props.wishlistId },
  });

  if (!wishlist) {
    throw new HttpException("Wishlist not found", 404);
  }
  if (wishlist.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("You do not own this wishlist", 403);
  }

  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.body.product_id },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (!product.is_active) {
    throw new HttpException("Product is not active", 400);
  }

  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: { shopping_mall_product_id: props.body.product_id },
  });

  if (!sku) {
    throw new HttpException("Product SKU not found", 404);
  }

  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.customer.id },
  });

  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }

  const now = toISOStringSafe(new Date());
  const wishlistItemId = v4();

  const created = await MyGlobal.prisma.shopping_mall_wishlist_items.create({
    data: {
      id: wishlistItemId,
      wishlist: { connect: { id: props.wishlistId } },
      product: { connect: { id: props.body.product_id } },
      productSku: { connect: { id: sku.id } },
      quantity: props.body.quantity,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: wishlistItemId,
    wishlist_id: props.wishlistId,
    product_id: props.body.product_id satisfies string as string,
    quantity: props.body.quantity satisfies number as number,
    options: undefined,
    created_at: now,
    updated_at: now,
    customer: {
      id: customer.id satisfies string as string,
      email: customer.email,
      name: customer.name,
      status: "active",
      created_at: toISOStringSafe(customer.created_at),
      updated_at: customer.updated_at
        ? toISOStringSafe(customer.updated_at)
        : undefined,
    },
    product: {
      id: product.id satisfies string as string,
      code: product.code,
      name: product.name,
      is_active: product.is_active,
      created_at: toISOStringSafe(product.created_at),
      updated_at: toISOStringSafe(product.updated_at),
      deleted_at: product.deleted_at ?? null,
    },
  };
}
