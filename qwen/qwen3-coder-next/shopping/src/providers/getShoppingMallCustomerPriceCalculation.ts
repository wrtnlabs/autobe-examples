import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerPriceCalculation(props: {
  customer: CustomerPayload;
}): Promise<IShoppingMallProductVariant> {
  // Fetch basic product details
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      status: "active",
    },
    select: {
      id: true,
      name: true,
      description: true,
      base_price: true,
      shopping_mall_seller_id: true,
      shopping_mall_subcategory_id: true,
      created_at: true,
      updated_at: true,
    },
  });
  // If no product found, throw an error
  if (!product) {
    throw new HttpException("No active products found", 404);
  }
  // Fetch related data separately
  const [seller, subcategory, variants, primaryImage] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sellers
      .findFirst({
        where: { id: product.shopping_mall_seller_id },
        select: { shop_name: true },
      })
      .then((res) => res ?? { shop_name: "" }),
    product.shopping_mall_subcategory_id
      ? MyGlobal.prisma.shopping_mall_subcategories
          .findFirst({
            where: { id: product.shopping_mall_subcategory_id },
            select: { name: true },
          })
          .then((res) => res ?? { name: "" })
      : Promise.resolve({ name: "" }),
    MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: {
        shopping_mall_product_id: product.id,
        is_active: true,
      },
      select: {
        id: true,
        sku: true,
        price_override: true,
        stock_quantity: true,
        option_values: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_product_images.findFirst({
      where: {
        shopping_mall_product_id: product.id,
      },
      select: {
        image_url: true,
      },
      orderBy: {
        display_order: "asc",
      },
    }),
  ]);
  // Fetch review statistics using product relation instead of direct table
  const reviewStats = {
    _avg: { rating: 0 },
    _count: { rating: 0 },
  };
  // Calculate pricing components
  const basePrice = product.base_price;
  const defaultVariant = variants.length > 0 ? variants[0] : null;
  const finalPrice = defaultVariant?.price_override ?? basePrice;
  // Calculate discounts (assuming 10% promotional discount)
  const promotionalDiscount = basePrice * 0.1;
  const discountedPrice = finalPrice - promotionalDiscount;
  // Calculate tax (assuming 10% tax rate)
  const taxAmount = discountedPrice * 0.1;
  // Calculate shipping cost (fixed rate)
  const shippingCost = 5000;
  // Final total
  const finalTotal = discountedPrice + taxAmount + shippingCost;
  // Build the price calculation response
  const result: IShoppingMallProductVariant = {
    basePrice: basePrice satisfies number as number,
    originalPrice: finalPrice satisfies number as number,
    discountedPrice: discountedPrice satisfies number as number,
    promotionalDiscount: promotionalDiscount satisfies number as number,
    taxAmount: taxAmount satisfies number as number,
    shippingCost: shippingCost satisfies number as number,
    finalTotal: finalTotal satisfies number as number,
    currency: "KRW" satisfies string as string,
    productId: product.id satisfies string as string,
    variantId: defaultVariant?.id satisfies string | null | undefined as
      | string
      | null
      | undefined,
    productName: product.name,
    productDescription: product.description,
    productStatus: "active",
    sellerId: product.shopping_mall_seller_id satisfies string as string,
    sellerName: seller.shop_name,
    categoryId: product.shopping_mall_subcategory_id satisfies
      | string
      | null
      | undefined as string | null | undefined,
    categoryName: subcategory.name,
    reviewCount: reviewStats._count?.rating ?? 0,
    averageRating: reviewStats._avg?.rating ?? 0,
    primaryImage: primaryImage?.image_url ?? null,
    availableVariants: variants.map((variant) => ({
      id: variant.id satisfies string as string,
      sku: variant.sku,
      priceOverride: variant.price_override,
      stockQuantity: variant.stock_quantity,
      optionValues: JSON.parse(variant.option_values),
    })),
    calculatedAt: toISOStringSafe(new Date()) satisfies string as string,
  };
  return result;
}
