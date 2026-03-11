import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEcommerceMallWishlistToCartRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistToCartRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartItemTransformer } from "../transformers/EcommerceMallCartItemTransformer";
import { EcommerceMallProductVariantAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantAtSummaryTransformer";
import { EcommerceMallShoppingCartAtSummaryTransformer } from "../transformers/EcommerceMallShoppingCartAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerWishlistToCart(props: {
  customer: CustomerPayload;
  body: IEcommerceMallWishlistToCartRequest;
}): Promise<IEcommerceMallCartItem> {
  // Step 1: Validate wishlist entry belongs to authenticated customer
  const wishlistEntry =
    await MyGlobal.prisma.ecommerce_mall_wishlists.findUnique({
      where: {
        ecommerce_mall_customer_id_ecommerce_mall_product_id: {
          ecommerce_mall_customer_id: props.customer.id,
          ecommerce_mall_product_id: props.body.wishlistEntryId,
        },
      },
      select: { ecommerce_mall_product_id: true },
    });
  if (wishlistEntry === null) {
    throw new HttpException("Wishlist entry not found", 404);
  }
  // Step 2: Fetch product from wishlist and verify it's active
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: wishlistEntry.ecommerce_mall_product_id },
    select: { id: true, is_active: true, base_price: true },
  });
  if (product === null || !product.is_active) {
    throw new HttpException("Product not found or inactive", 404);
  }
  // Step 3: Fetch variant and validate it belongs to the same product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: props.body.variantId },
      select: {
        id: true,
        product_id: true,
        is_active: true,
        stock_quantity: true,
        price_override: true,
      },
    });
  if (variant === null) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.product_id !== product.id) {
    throw new HttpException(
      "Variant does not belong to wishlisted product",
      400,
    );
  }
  if (!variant.is_active) {
    throw new HttpException("Variant is not active", 400);
  }
  if (variant.stock_quantity <= 0) {
    throw new HttpException("Variant is out of stock", 400);
  }
  // Step 4: Find or create customer's shopping cart
  let cart = await MyGlobal.prisma.ecommerce_mall_shopping_carts.findFirst({
    where: { customer_id: props.customer.id },
  });
  if (cart === null) {
    cart = await MyGlobal.prisma.ecommerce_mall_shopping_carts.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        customer_id: props.customer.id,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  }
  // Step 5: Check if cart item exists for this variant
  const existingCartItem =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findUnique({
      where: {
        cart_id_variant_id: {
          cart_id: cart.id,
          variant_id: props.body.variantId,
        },
      },
    });
  // Step 6: Create or update cart item
  const cartItem =
    existingCartItem !== null
      ? await MyGlobal.prisma.ecommerce_mall_cart_items.update({
          where: { id: existingCartItem.id },
          data: {
            quantity: existingCartItem.quantity + 1,
            updated_at: toISOStringSafe(new Date()),
          },
          select: {
            id: true,
            quantity: true,
            price: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            cart: EcommerceMallShoppingCartAtSummaryTransformer.select(),
            variant: EcommerceMallProductVariantAtSummaryTransformer.select(),
          },
        })
      : await MyGlobal.prisma.ecommerce_mall_cart_items.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            cart_id: cart.id,
            variant_id: props.body.variantId,
            quantity: 1,
            price: variant.price_override ?? product.base_price,
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
            deleted_at: null,
          },
          select: {
            id: true,
            quantity: true,
            price: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            cart: EcommerceMallShoppingCartAtSummaryTransformer.select(),
            variant: EcommerceMallProductVariantAtSummaryTransformer.select(),
          },
        });
  // Step 7: Update cart's updated_at timestamp
  await MyGlobal.prisma.ecommerce_mall_shopping_carts.update({
    where: { id: cart.id },
    data: { updated_at: toISOStringSafe(new Date()) },
  });
  // Step 8: Return cart item with full details
  return await EcommerceMallCartItemTransformer.transform(cartItem);
}
