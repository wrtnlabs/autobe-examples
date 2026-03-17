import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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

export async function getShoppingMallCustomerCartItemsItemId(props: {
  customer: CustomerPayload;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCartItem> {
  const cartItem =
    await MyGlobal.prisma.shopping_mall_cart_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        shopping_mall_cart_id: true,
        cart: {
          select: {
            shopping_customer_id: true,
          },
        },
        variant: {
          select: {
            id: true,
            deleted: true,
            created_at: true,
            deleted_at: true,
            updated_at: true,
            shopping_mall_product_id: true,
            sku_code: true,
            price: true,
            stock_quantity: true,
            product: {
              select: {
                id: true,
                name: true,
                base_price: true,
                shopping_seller_id: true,
                shopping_category_id: true,
                images: {
                  select: {
                    id: true,
                    image_url: true,
                    display_order: true,
                    created_at: true,
                  },
                  orderBy: { display_order: "asc" },
                },
                variants: {
                  select: {
                    id: true,
                    sku_code: true,
                    price: true,
                    stock_quantity: true,
                    options: {
                      select: {
                        id: true,
                        key: true,
                        value: true,
                        created_at: true,
                        updated_at: true,
                      },
                    },
                  },
                },
                created_at: true,
                seller: {
                  select: {
                    id: true,
                    email: true,
                    shop_name: true,
                    shop_description: true,
                    logo_image_url: true,
                    approval_status: true,
                    suspended: true,
                    created_at: true,
                    approved_by_admin_id: true,
                    approvedByAdmin: {
                      select: {
                        id: true,
                        email: true,
                        grade: true,
                        created_at: true,
                        updated_at: true,
                        deleted_at: true,
                      },
                    },
                  },
                },
                category: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    parent_category_id: true,
                    created_at: true,
                    parent: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        parent_category_id: true,
                        created_at: true,
                      },
                    },
                  },
                },
              },
            },
            options: {
              select: {
                id: true,
                key: true,
                value: true,
                created_at: true,
                updated_at: true,
              },
            },
          },
        },
        quantity: true,
        available: true,
        created_at: true,
        updated_at: true,
      },
    });
  if (cartItem.cart.shopping_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: cartItem.id,
    quantity: cartItem.quantity,
    available: cartItem.available,
    subtotal:
      (cartItem.variant.price ?? cartItem.variant.product.base_price) *
      cartItem.quantity,
    stockWarning: cartItem.variant.stock_quantity < cartItem.quantity,
    product: {
      id: cartItem.variant.product.id,
      name: cartItem.variant.product.name,
      basePrice: cartItem.variant.product.base_price,
      seller: {
        id: cartItem.variant.product.seller.id,
        email: cartItem.variant.product.seller.email,
        shop_name: cartItem.variant.product.seller.shop_name,
        shop_description: cartItem.variant.product.seller.shop_description,
        logo_image_url: cartItem.variant.product.seller.logo_image_url,
        approval_status: typia.assert<"PENDING" | "APPROVED" | "REJECTED">(
          cartItem.variant.product.seller.approval_status,
        ),
        suspended: cartItem.variant.product.seller.suspended,
        created_at: toISOStringSafe(cartItem.variant.product.seller.created_at),
        approvedByAdmin: cartItem.variant.product.seller.approvedByAdmin
          ? {
              id: cartItem.variant.product.seller.approvedByAdmin.id,
              email: cartItem.variant.product.seller.approvedByAdmin.email,
              grade: cartItem.variant.product.seller.approvedByAdmin.grade,
              created_at: toISOStringSafe(
                cartItem.variant.product.seller.approvedByAdmin.created_at,
              ),
              updated_at: toISOStringSafe(
                cartItem.variant.product.seller.approvedByAdmin.updated_at,
              ),
              deleted_at: cartItem.variant.product.seller.approvedByAdmin
                .deleted_at
                ? toISOStringSafe(
                    cartItem.variant.product.seller.approvedByAdmin.deleted_at,
                  )
                : null,
            }
          : null,
      },
      category: {
        id: cartItem.variant.product.category.id,
        name: cartItem.variant.product.category.name,
        description: cartItem.variant.product.category.description ?? undefined,
        parent: cartItem.variant.product.category.parent
          ? {
              id: cartItem.variant.product.category.parent.id,
              name: cartItem.variant.product.category.parent.name,
              description:
                cartItem.variant.product.category.parent.description ??
                undefined,
              created_at: toISOStringSafe(
                cartItem.variant.product.category.parent.created_at,
              ),
            }
          : null,
        created_at: toISOStringSafe(
          cartItem.variant.product.category.created_at,
        ),
      },
      mainImage:
        cartItem.variant.product.images.length > 0
          ? {
              id: cartItem.variant.product.images[0].id,
              imageUrl: cartItem.variant.product.images[0].image_url,
              displayOrder: cartItem.variant.product.images[0].display_order,
              createdAt: toISOStringSafe(
                cartItem.variant.product.images[0].created_at,
              ),
            }
          : null,
      variantCount: cartItem.variant.product.variants.length,
      averageRating: undefined,
      reviewCount: 0,
      createdAt: toISOStringSafe(cartItem.variant.product.created_at),
    },
    variant: {
      id: cartItem.variant.id,
      skuCode: cartItem.variant.sku_code,
      optionValues: cartItem.variant.options.map((opt) => ({
        id: opt.id,
        key: opt.key,
        value: opt.value,
        variant: {
          id: cartItem.variant.id,
          skuCode: cartItem.variant.sku_code,
          optionValues: [],
          stockQuantity: cartItem.variant.stock_quantity,
        },
        created_at: toISOStringSafe(opt.created_at),
        updated_at: toISOStringSafe(opt.updated_at),
      })),
      price: cartItem.variant.price ?? undefined,
      stockQuantity: cartItem.variant.stock_quantity,
    },
    createdAt: toISOStringSafe(cartItem.created_at),
    updatedAt: toISOStringSafe(cartItem.updated_at),
  };
}
