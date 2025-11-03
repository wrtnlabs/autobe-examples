import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerShoppingCartsId(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShoppingCart> {
  try {
    const cart =
      await MyGlobal.prisma.shopping_mall_shopping_carts.findUniqueOrThrow({
        where: {
          id: props.id,
          shopping_mall_customer_id: props.customer.id,
        },
        include: {
          shopping_mall_cart_items: true,
          customerSession: true,
          customer: true,
        },
      });

    return {
      id: cart.id,
      shopping_mall_customer_id: cart.shopping_mall_customer_id,
      shopping_mall_customer_session_id: cart.shopping_mall_customer_session_id,
      created_at: toISOStringSafe(cart.created_at),
      updated_at: toISOStringSafe(cart.updated_at),
      deleted_at: cart.deleted_at ? toISOStringSafe(cart.deleted_at) : null,
      shopping_mall_cart_items: cart.shopping_mall_cart_items?.map((item) => ({
        id: item.id,
        shopping_mall_shopping_cart_id: item.shopping_mall_shopping_cart_id,
        shopping_mall_product_sku_id: item.shopping_mall_product_sku_id,
        quantity: item.quantity,
        created_at: toISOStringSafe(item.created_at),
        updated_at: toISOStringSafe(item.updated_at),
        deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
      })),
      customerSession: cart.customerSession
        ? {
            id: cart.customerSession.id,
            shopping_mall_customer_id:
              cart.customerSession.shopping_mall_customer_id,
            ip: cart.customerSession.ip,
            href: cart.customerSession.href,
            referrer: cart.customerSession.referrer,
            created_at: toISOStringSafe(cart.customerSession.created_at),
            expired_at: cart.customerSession.expired_at
              ? toISOStringSafe(cart.customerSession.expired_at)
              : null,
          }
        : undefined,
      customer: cart.customer
        ? {
            id: cart.customer.id,
            email: cart.customer.email,
            password_hash: cart.customer.password_hash,
            nickname: cart.customer.nickname,
            created_at: toISOStringSafe(cart.customer.created_at),
            updated_at: toISOStringSafe(cart.customer.updated_at),
            deleted_at: cart.customer.deleted_at
              ? toISOStringSafe(cart.customer.deleted_at)
              : null,
          }
        : undefined,
    };
  } catch {
    throw new HttpException("Shopping cart not found or unauthorized", 404);
  }
}
