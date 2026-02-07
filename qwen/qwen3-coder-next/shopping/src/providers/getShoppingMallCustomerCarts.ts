import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
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

export async function getShoppingMallCustomerCarts(props: {
  customer: CustomerPayload;
}): Promise<IShoppingMallCart.ISummary> {
  // Query all active cart items for the authenticated customer
  // Using select instead of include for Prisma compatibility
  const carts = await MyGlobal.prisma.shopping_mall_carts.findMany({
    where: {
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    select: {
      id: true,
      quantity: true,
      created_at: true,
      updated_at: true,
      variant: {
        select: {
          id: true,
          shopping_mall_product_id: true,
          sku: true,
          option_values: true,
          stock_quantity: true,
          is_active: true,
          product: {
            select: {
              id: true,
              name: true,
              base_price: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });
  // Transform to response format
  const items = carts.map((cart) => {
    const product = cart.variant.product;
    return {
      id: cart.id as string & tags.Format<"uuid">,
      quantity: cart.quantity,
      created_at: toISOStringSafe(cart.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(cart.updated_at) as string &
        tags.Format<"date-time">,
      product: {
        id: product.id as string & tags.Format<"uuid">,
        name: product.name,
        base_price: product.base_price,
        status: product.status,
      },
      variant: {
        id: cart.variant.id as string & tags.Format<"uuid">,
        sku: cart.variant.sku,
        option_values: JSON.parse(cart.variant.option_values),
        stock_quantity: cart.variant.stock_quantity,
        is_active: cart.variant.is_active,
      },
      availability: {
        in_stock: cart.variant.stock_quantity >= cart.quantity,
        stock_quantity: cart.variant.stock_quantity,
        available_quantity: Math.min(
          cart.variant.stock_quantity,
          cart.quantity,
        ),
      },
    };
  });
  return {
    items,
  };
}
