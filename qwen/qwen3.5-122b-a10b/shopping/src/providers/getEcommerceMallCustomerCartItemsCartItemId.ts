import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
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

export async function getEcommerceMallCustomerCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCartItem> {
  const cartItem =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findUniqueOrThrow({
      where: {
        id: props.cartItemId,
        customer_id: props.customer.id,
        deleted_at: null,
      },
      select: {
        id: true,
        quantity: true,
        is_available: true,
        added_at: true,
        productVariant: {
          select: {
            id: true,
            sku_code: true,
            price: true,
            stock_quantity: true,
            deleted_at: true,
            product: {
              select: {
                id: true,
                name: true,
                base_price: true,
                status: true,
                deleted_at: true,
              },
            },
            variantOptions: {
              select: {
                key: true,
                value: true,
              },
            },
          },
        },
      },
    });
  const unitPrice =
    cartItem.productVariant.price ?? cartItem.productVariant.product.base_price;
  const subtotal = cartItem.quantity * unitPrice;
  return {
    items: [
      {
        id: cartItem.id,
        quantity: cartItem.quantity,
        is_available: cartItem.is_available,
        added_at: toISOStringSafe(cartItem.added_at),
        product_variant: {
          id: cartItem.productVariant.id,
          sku_code: cartItem.productVariant.sku_code,
          price: cartItem.productVariant.price ?? null,
          stock_quantity: cartItem.productVariant.stock_quantity,
          option_values: Object.fromEntries(
            cartItem.productVariant.variantOptions.map(
              (option: { key: string; value: string }) => [
                option.key,
                option.value,
              ],
            ),
          ),
        } satisfies IEcommerceMallProductVariant.ISummary,
        subtotal: subtotal,
      } satisfies IEcommerceMallCartItem.ISummary,
    ],
    total: subtotal,
  } satisfies IEcommerceMallCartItem;
}
