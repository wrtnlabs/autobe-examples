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
import { EcommerceCustomerAtSummaryTransformer } from "../transformers/EcommerceCustomerAtSummaryTransformer";
import { EcommerceProductVariantAtSummaryTransformer } from "../transformers/EcommerceProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerCartsCartId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCart> {
  // Validate cart exists and is not deleted
  const cart = await MyGlobal.prisma.ecommerce_carts.findFirst({
    where: {
      id: props.cartId,
      deleted_at: null,
    },
  });
  if (cart === null) {
    throw new HttpException("Cart not found", 404);
  }
  // Verify cart ownership
  if (cart.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch cart items with product variants and inventory records
  const cartItems = await MyGlobal.prisma.ecommerce_cart_items.findMany({
    where: {
      ecommerce_cart_id: props.cartId,
      deleted_at: null,
    },
    include: {
      productVariant: {
        include: {
          inventoryRecords: {
            where: {
              deleted_at: null,
            },
          },
          orderItems: true,
          cartItems: true,
          product: {
            include: {
              seller: {
                select: {
                  id: true,
                  approval_status: true,
                  is_suspended: true,
                  is_banned: true,
                  created_at: true,
                  profile: {
                    select: {
                      shop_name: true,
                      shop_description: true,
                    },
                  },
                },
              },
              reviews: true,
              variants: true,
              productImages: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                  parent_id: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { created_at: "asc" },
  });
  // Transform cart items with availability status
  const items: IEcommerceCartItem[] = await ArrayUtil.asyncMap(
    cartItems,
    async (item) => {
      // Calculate stock quantity from inventory records
      const stockQuantity = item.productVariant.inventoryRecords.reduce(
        (sum, record) => sum + record.quantity_change,
        0,
      );
      // Determine availability status
      const availabilityStatus = stockQuantity > 0;
      return {
        id: item.id,
        quantity: item.quantity,
        productVariant:
          await EcommerceProductVariantAtSummaryTransformer.transform(
            item.productVariant,
          ),
        availabilityStatus,
        createdAt: toISOStringSafe(item.created_at),
        updatedAt: toISOStringSafe(item.updated_at),
        deletedAt: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
      } satisfies IEcommerceCartItem;
    },
  );
  // Calculate totals
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
  // Fetch customer summary
  const customer = await MyGlobal.prisma.ecommerce_customers.findFirstOrThrow({
    where: {
      id: props.customer.id,
      deleted_at: null,
    },
  });
  return {
    id: cart.id,
    customer: await EcommerceCustomerAtSummaryTransformer.transform(customer),
    items,
    total_amount,
    item_count,
    unavailable_count,
    created_at: toISOStringSafe(cart.created_at),
    updated_at: toISOStringSafe(cart.updated_at),
    deleted_at: cart.deleted_at ? toISOStringSafe(cart.deleted_at) : null,
  } satisfies IEcommerceCart;
}
