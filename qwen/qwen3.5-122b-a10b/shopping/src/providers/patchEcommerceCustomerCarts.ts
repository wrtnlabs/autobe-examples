import { IEcommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCart";
import { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function patchEcommerceCustomerCarts(props: {
  customer: CustomerPayload;
  body: IEcommerceCart.IRequest;
}): Promise<IEcommerceCart> {
  const includeDetails = props.body.include_details ?? true;
  const validateStock = props.body.validate_stock ?? true;
  const validateAvailability = props.body.validate_availability ?? true;
  const cart = await MyGlobal.prisma.ecommerce_carts.findUnique({
    where: { ecommerce_customer_id: props.customer.id },
    include: {
      customer: {
        select: {
          id: true,
          email: true,
          display_name: true,
          phone_number: true,
          created_at: true,
          deleted_at: true,
        },
      },
      cartItems: {
        where: { deleted_at: null },
        include: {
          productVariant: {
            include: {
              product: {
                include: {
                  seller: {
                    include: {
                      profile: true,
                    },
                  },
                  category: {
                    include: {
                      parentCategory: {
                        select: {
                          id: true,
                          name: true,
                          description: true,
                          created_at: true,
                          updated_at: true,
                          deleted_at: true,
                        },
                      },
                    },
                  },
                  reviews: {
                    select: {
                      rating: true,
                    },
                  },
                  productImages: {
                    select: {
                      image_url: true,
                      display_order: true,
                    },
                    orderBy: { display_order: "asc" as const },
                  },
                  variants: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
              inventoryRecords: validateStock
                ? {
                    select: {
                      quantity_change: true,
                    },
                  }
                : undefined,
            },
          },
        },
        orderBy: { created_at: "desc" as const },
      },
    },
  });
  if (!cart) {
    throw new HttpException("Cart not found", 404);
  }
  const items = await ArrayUtil.asyncMap(
    cart.cartItems,
    async (cartItem): Promise<IEcommerceCartItem> => {
      const variant = cartItem.productVariant;
      const product = variant.product;
      const stockCount = validateStock
        ? variant.inventoryRecords.reduce(
            (sum, record) => sum + record.quantity_change,
            0,
          )
        : 0;
      const isProductDeleted = validateAvailability
        ? product.deleted_at !== null
        : false;
      const isVariantDeleted = validateAvailability
        ? variant.deleted_at !== null
        : false;
      const isOutOfStock =
        validateStock && validateAvailability ? stockCount === 0 : false;
      const availabilityStatus =
        !isProductDeleted && !isVariantDeleted && !isOutOfStock;
      let average_rating: number | null = null;
      if (product.reviews.length > 0) {
        const sum = product.reviews.reduce(
          (acc, review) => acc + review.rating,
          0,
        );
        average_rating = sum / product.reviews.length;
      }
      const main_image_url =
        product.productImages.length > 0
          ? product.productImages[0].image_url
          : null;
      const product_stock_status =
        product.variants.length > 0 ? "in_stock" : "out_of_stock";
      const productSummary: IEcommerceProduct.ISummary = {
        id: product.id,
        name: product.name,
        base_price: Number(product.base_price),
        seller: {
          id: product.seller.id,
          approval_status: product.seller.approval_status,
          is_suspended: product.seller.is_suspended,
          is_banned: product.seller.is_banned,
          created_at: toISOStringSafe(product.seller.created_at),
          shop_name: product.seller.profile?.shop_name ?? "",
          shop_description: product.seller.profile?.shop_description ?? null,
        } satisfies IEcommerceSeller.ISummary,
        category: {
          id: product.category.id,
          name: product.category.name,
          description: product.category.description ?? null,
          parent: product.category.parentCategory
            ? ({
                id: product.category.parentCategory.id,
                name: product.category.parentCategory.name,
                description:
                  product.category.parentCategory.description ?? null,
                parent: null,
                created_at: toISOStringSafe(
                  product.category.parentCategory.created_at,
                ),
                updated_at: toISOStringSafe(
                  product.category.parentCategory.updated_at,
                ),
                deleted_at: product.category.parentCategory.deleted_at
                  ? toISOStringSafe(product.category.parentCategory.deleted_at)
                  : null,
              } satisfies IEcommerceCategory.ISummary)
            : null,
          created_at: toISOStringSafe(product.category.created_at),
          updated_at: toISOStringSafe(product.category.updated_at),
          deleted_at: product.category.deleted_at
            ? toISOStringSafe(product.category.deleted_at)
            : null,
        } satisfies IEcommerceCategory.ISummary,
        average_rating,
        main_image_url,
        stock_status: product_stock_status,
        created_at: toISOStringSafe(product.created_at),
        updated_at: toISOStringSafe(product.updated_at),
        deleted_at: product.deleted_at
          ? toISOStringSafe(product.deleted_at)
          : null,
      } satisfies IEcommerceProduct.ISummary;
      const variantSummary: IEcommerceProductVariant.ISummary = {
        id: variant.id,
        sku_code: variant.sku_code,
        option_values: variant.option_values,
        price: variant.price ?? undefined,
        stock_count: stockCount,
        product: productSummary,
        created_at: toISOStringSafe(variant.created_at),
        updated_at: toISOStringSafe(variant.updated_at),
      } satisfies IEcommerceProductVariant.ISummary;
      const cartItemResult: IEcommerceCartItem = {
        id: cartItem.id,
        quantity: cartItem.quantity,
        productVariant: variantSummary,
        availabilityStatus,
        createdAt: toISOStringSafe(cartItem.created_at),
        updatedAt: toISOStringSafe(cartItem.updated_at),
        deletedAt: cartItem.deleted_at
          ? toISOStringSafe(cartItem.deleted_at)
          : null,
      } satisfies IEcommerceCartItem;
      return cartItemResult;
    },
  );
  const item_count = items.length;
  const unavailable_count = items.filter(
    (item) => !item.availabilityStatus,
  ).length;
  const total_amount = items
    .filter((item) => item.availabilityStatus)
    .reduce((sum, item) => {
      const price =
        item.productVariant.price ?? item.productVariant.product.base_price;
      return sum + price * item.quantity;
    }, 0);
  const customerSummary: IEcommerceCustomer.ISummary = {
    id: cart.customer.id,
    email: cart.customer.email,
    display_name: cart.customer.display_name,
    phone_number: cart.customer.phone_number,
    created_at: toISOStringSafe(cart.customer.created_at),
    deleted_at: cart.customer.deleted_at
      ? toISOStringSafe(cart.customer.deleted_at)
      : null,
  } satisfies IEcommerceCustomer.ISummary;
  const cartResult: IEcommerceCart = {
    id: cart.id,
    customer: customerSummary,
    items,
    total_amount,
    item_count,
    unavailable_count,
    created_at: toISOStringSafe(cart.created_at),
    updated_at: toISOStringSafe(cart.updated_at),
    deleted_at: cart.deleted_at ? toISOStringSafe(cart.deleted_at) : null,
  } satisfies IEcommerceCart;
  return cartResult;
}
