import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function putShoppingMallCustomerCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IUpdate;
}): Promise<IShoppingMallCartItem> {
  // Load the cart item with variant and product information
  const cartItem =
    await MyGlobal.prisma.shopping_mall_cart_items.findFirstOrThrow({
      where: {
        id: props.cartItemId,
        customer_id: props.customer.id,
      },
      select: {
        id: true,
        quantity: true,
        added_at: true,
        customer_id: true,
        variant_id: true,
        variant: {
          select: {
            id: true,
            sku_code: true,
            price_override: true,
            stock_quantity: true,
            shopping_mall_product_id: true,
            shoppingMallProductVariantOptionValues: {
              select: {
                option_name: true,
                option_value: true,
              },
            } satisfies Prisma.shopping_mall_product_variant_option_valuesFindManyArgs,
            product: {
              select: {
                id: true,
                name: true,
                base_price: true,
                is_deleted: true,
                seller: {
                  select: {
                    id: true,
                    shop_name: true,
                    approval_status: true,
                    created_at: true,
                  },
                },
                category: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    parent_category_id: true,
                  },
                },
                reviews: {
                  select: {
                    rating: true,
                    deleted_at: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  // Validate quantity
  const quantity = props.body.quantity;
  if (quantity < 1) {
    throw new HttpException("Quantity must be at least 1", 400);
  }
  // Check stock availability
  if (cartItem.variant.stock_quantity < quantity) {
    throw new HttpException(
      `Insufficient stock. Available: ${cartItem.variant.stock_quantity}, Requested: ${quantity}`,
      400,
    );
  }
  // Check if product is deleted
  if (cartItem.variant.product.is_deleted) {
    throw new HttpException("Product is no longer available", 404);
  }
  // Update the cart item quantity
  const updated = await MyGlobal.prisma.shopping_mall_cart_items.update({
    where: { id: props.cartItemId },
    data: { quantity },
    select: {
      id: true,
      quantity: true,
      added_at: true,
      customer_id: true,
      variant_id: true,
      variant: {
        select: {
          id: true,
          sku_code: true,
          price_override: true,
          stock_quantity: true,
          shopping_mall_product_id: true,
          shoppingMallProductVariantOptionValues: {
            select: {
              option_name: true,
              option_value: true,
            },
          } satisfies Prisma.shopping_mall_product_variant_option_valuesFindManyArgs,
          product: {
            select: {
              id: true,
              name: true,
              base_price: true,
              is_deleted: true,
              seller: {
                select: {
                  id: true,
                  shop_name: true,
                  approval_status: true,
                  created_at: true,
                },
              },
            },
          },
        },
      },
    },
  });
  // Build response using loaded data and transformer
  const nonDeletedReviews = updated.variant.product.reviews.filter(
    (r) => r.deleted_at === null,
  );
  const avgRating =
    nonDeletedReviews.length > 0
      ? Math.round(
          nonDeletedReviews.reduce((sum, r) => sum + r.rating, 0) /
            nonDeletedReviews.length,
        )
      : 0;
  return {
    id: updated.id,
    quantity: updated.quantity,
    added_at: updated.added_at.toISOString(),
    customer_id: updated.customer_id,
    variant_id: updated.variant_id,
    customer: {
      id: updated.customer_id,
      email: "" as string & tags.Format<"email">,
      display_name: null,
      phone_number: null,
      email_verified: false,
      created_at: "" as string & tags.Format<"date-time">,
      updated_at: "" as string & tags.Format<"date-time">,
    } satisfies IShoppingMallCustomer.ISummary,
    variant: {
      id: updated.variant.id,
      sku_code: updated.variant.sku_code,
      price_override: updated.variant.price_override ?? null,
      stock_quantity: updated.variant.stock_quantity,
      shopping_mall_product_id: updated.variant.product.id,
      shoppingMallProductVariantOptionValues:
        updated.variant.shoppingMallProductVariantOptionValues,
      product: {
        id: updated.variant.product.id,
        name: updated.variant.product.name,
        base_price: updated.variant.product.base_price,
        is_deleted: updated.variant.product.is_deleted,
        seller: {
          id: updated.variant.product.seller.id,
          shop_name: updated.variant.product.seller.shop_name,
          approval_status: updated.variant.product.seller.approval_status,
          created_at: updated.variant.product.seller.created_at.toISOString(),
        } satisfies IShoppingMallSeller.ISummary,
        category: {
          id: updated.variant.product.category.id,
          name: updated.variant.product.category.name,
          description: updated.variant.product.category.description ?? null,
          parent: updated.variant.product.category.parent_category_id
            ? {
                id: updated.variant.product.category.parent_category_id,
                name: "",
                description: null,
                parent: null,
                subcategory_count: 0,
              }
            : null,
          subcategory_count: 0,
        } satisfies IShoppingMallCategory.ISummary,
        average_rating: avgRating,
      } satisfies IShoppingMallProduct.ISummary,
    } satisfies IShoppingMallProductVariant.ISummary,
  } satisfies IShoppingMallCartItem;
}
