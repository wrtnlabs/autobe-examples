import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallCartItemSelectedOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSelectedOptions";
import { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";
import { IShoppingMallSkuAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttributeValue";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerShoppingCartsShoppingCartIdCartItemsCartItemId(props: {
  customer: CustomerPayload;
  shoppingCartId: string & tags.Format<"uuid">;
  cartItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCartItem> {
  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
    where: {
      id: props.cartItemId,
      shopping_mall_shopping_cart_id: props.shoppingCartId,
    },
  });

  if (!cartItem) {
    throw new HttpException("Cart item not found", 404);
  }

  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: {
      id: cartItem.shopping_mall_product_id,
    },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  const selectedOptions =
    await MyGlobal.prisma.shopping_mall_cart_item_selected_options.findMany({
      where: {
        shopping_mall_cart_item_id: props.cartItemId,
      },
      include: {
        shopping_mall_sku_option: true,
        shopping_mall_sku_attribute_value: true,
      },
    });

  return {
    id: cartItem.id,
    shopping_cart_id: cartItem.shopping_mall_shopping_cart_id,
    product: {
      id: product.id satisfies string as string & tags.Format<"uuid">,
      code: product.code,
      name: product.name,
      is_active: product.is_active,
      created_at:
        product.created_at === null
          ? undefined
          : toISOStringSafe(product.created_at),
      updated_at:
        product.updated_at === null
          ? undefined
          : toISOStringSafe(product.updated_at),
      deleted_at:
        product.deleted_at === null
          ? undefined
          : toISOStringSafe(product.deleted_at),
    },
    quantity: cartItem.quantity,
    selected_options:
      selectedOptions.length === 0
        ? undefined
        : selectedOptions.map(
            (option: {
              id: string & tags.Format<"uuid">;
              shopping_mall_sku_option: {
                id: string & tags.Format<"uuid">;
                name: string;
                type: string;
              };
              shopping_mall_sku_attribute_value: {
                id: string & tags.Format<"uuid">;
                value: string;
              };
              created_at: Date | null;
            }) => ({
              id: option.id satisfies string as string & tags.Format<"uuid">,
              option: {
                id: option.shopping_mall_sku_option
                  .id satisfies string as string & tags.Format<"uuid">,
                name: option.shopping_mall_sku_option.name,
                type: option.shopping_mall_sku_option.type,
              },
              candidate: {
                id: option.shopping_mall_sku_attribute_value
                  .id satisfies string as string & tags.Format<"uuid">,
                value: option.shopping_mall_sku_attribute_value.value,
              },
              created_at:
                option.created_at === null
                  ? undefined
                  : toISOStringSafe(option.created_at),
            }),
          ),
    created_at:
      cartItem.created_at === null
        ? undefined
        : toISOStringSafe(cartItem.created_at),
    updated_at:
      cartItem.updated_at === null
        ? undefined
        : toISOStringSafe(cartItem.updated_at),
  };
}
