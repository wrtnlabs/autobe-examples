import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
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

export async function getEcommerceMallCustomerCartsCartIdItemsItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCartItem> {
  const cartItem =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findUniqueOrThrow({
      where: {
        id: props.itemId,
        cart_id: props.cartId,
        deleted_at: null,
      },
      include: {
        cart: {
          select: {
            customer_id: true,
            id: true,
            created_at: true,
            updated_at: true,
          },
        },
        variant: {
          include: {
            product: {
              include: {
                category: true,
                seller: true,
              },
            },
          },
        },
      },
    });
  if (cartItem.cart.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: cartItem.id as string & tags.Format<"uuid">,
    cart: {
      id: cartItem.cart.id as string & tags.Format<"uuid">,
      customerId: cartItem.cart.customer_id as string & tags.Format<"uuid">,
      createdAt: toISOStringSafe(cartItem.cart.created_at),
      updatedAt: toISOStringSafe(cartItem.cart.updated_at),
      itemCount: 0,
      subtotal: 0,
      tax: 0,
      total: 0,
      sellerSubtotals: undefined,
      cartItems: [],
    },
    variant: {
      id: cartItem.variant.id as string & tags.Format<"uuid">,
      skuCode: cartItem.variant.sku_code,
      optionValues: cartItem.variant.option_values,
      priceOverride: cartItem.variant.price_override,
      stockQuantity: cartItem.variant.stock_quantity,
      isActive: cartItem.variant.is_active,
      product: {
        id: cartItem.variant.product.id as string & tags.Format<"uuid">,
        name: cartItem.variant.product.name,
        basePrice: cartItem.variant.product.base_price,
        category: {
          id: cartItem.variant.product.category.id as string &
            tags.Format<"uuid">,
          name: cartItem.variant.product.category.name,
          description: cartItem.variant.product.category.description ?? null,
          parent: null as IEcommerceMallCategory.ISummary | null,
          isLeaf: cartItem.variant.product.category.is_leaf,
          createdAt: toISOStringSafe(
            cartItem.variant.product.category.created_at,
          ),
          deletedAt: cartItem.variant.product.category.deleted_at
            ? toISOStringSafe(cartItem.variant.product.category.deleted_at)
            : null,
        },
        seller: {
          id: cartItem.variant.product.seller.id as string &
            tags.Format<"uuid">,
          email: cartItem.variant.product.seller.email,
          approvalStatus: cartItem.variant.product.seller.approval_status as
            | "pending"
            | "approved"
            | "rejected",
          rejectionReason: cartItem.variant.product.seller.rejection_reason,
          isSuspended: cartItem.variant.product.seller.is_suspended,
          isBanned: cartItem.variant.product.seller.is_banned,
          createdAt: toISOStringSafe(
            cartItem.variant.product.seller.created_at,
          ),
          updatedAt: toISOStringSafe(
            cartItem.variant.product.seller.updated_at,
          ),
        },
        isActive: cartItem.variant.product.is_active,
      },
    },
    quantity: cartItem.quantity as number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
    price: cartItem.price,
    createdAt: toISOStringSafe(cartItem.created_at),
    updatedAt: toISOStringSafe(cartItem.updated_at),
    deletedAt: cartItem.deleted_at
      ? toISOStringSafe(cartItem.deleted_at)
      : null,
  };
}
