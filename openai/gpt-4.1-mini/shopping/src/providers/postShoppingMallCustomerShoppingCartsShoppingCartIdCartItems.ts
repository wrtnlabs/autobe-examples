import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe"

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCartItemSelectedOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSelectedOptions";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";
import { IShoppingMallSkuAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttributeValue";
import { CustomerPayload } from "../decorators/payload/CustomerPayload"

export async function postShoppingMallCustomerShoppingCartsShoppingCartIdCartItems(props: {
  customer: CustomerPayload;
  shoppingCartId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  const cart = await MyGlobal.prisma.shopping_mall_shopping_carts.findUnique({
    where: { id: props.shoppingCartId },
  });

  if (cart === null || cart.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Shopping cart not found", 404);
  }

  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.body.product_id },
  });

  if (product === null || !product.is_active) {
    throw new HttpException("Product not found or inactive", 404);
  }

  const productSkuId: string | undefined =
    props.body.selected_options && props.body.selected_options.length > 0
      ? undefined
      : undefined;

  const createdCartItem = await MyGlobal.prisma.shopping_mall_cart_items.create({
    data: {
      id: (() => {
        const id = v4();
        return id satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">;
      })(),
      shopping_mall_shopping_cart_id: props.shoppingCartId,
      shopping_mall_product_id: props.body.product_id,
      quantity: props.body.quantity,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      shopping_mall_product_sku_id: productSkuId,
    },
  });

  if (props.body.selected_options && props.body.selected_options.length > 0) {
    await Promise.all(
      props.body.selected_options.map((option: IShoppingMallCartItemSelectedOptions.ICreate) =>
        MyGlobal.prisma.shopping_mall_cart_item_selected_option.create({
          data: {
            id: (() => {
              const id = v4();
              return id satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">;
            })(),
            shopping_mall_cart_item_id: createdCartItem.id,
            shopping_mall_sku_option_id: option.option_id,
            shopping_mall_sku_option_candidate_id: option.candidate_id,
            created_at: toISOStringSafe(new Date()),
          },
        }),
    );
  }

  const fullCartItem = await MyGlobal.prisma.shopping_mall_cart_items.findUnique({
    where: { id: createdCartItem.id },
    include: {
      shopping_mall_product: true,
      shopping_mall_cart_item_selected_option: {
        include: {
          shopping_mall_sku_option: true,
          shopping_mall_sku_option_candidate: true,
        },
      },
    },
  });

  if (!fullCartItem) {
    throw new HttpException("Failed to retrieve the created cart item", 500);
  }

  const productSummary: IShoppingMallProduct.ISummary = {
    id: fullCartItem.shopping_mall_product_id satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">,
    code: fullCartItem.shopping_mall_product.code,
    name: fullCartItem.shopping_mall_product.name,
    is_active: fullCartItem.shopping_mall_product.is_active,
    created_at: toISOStringSafe(fullCartItem.shopping_mall_product.created_at),
    updated_at: toISOStringSafe(fullCartItem.shopping_mall_product.updated_at),
    deleted_at: fullCartItem.shopping_mall_product.deleted_at ?? null,
  };

  const selectedOptions: IShoppingMallCartItemSelectedOptions[] | undefined =
    fullCartItem.shopping_mall_cart_item_selected_option.length > 0
      ? fullCartItem.shopping_mall_cart_item_selected_option.map(
          (option: IShoppingMallCartItemSelectedOptions) => ({
            id: option.id satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">,
            option: {
              id: option.shopping_mall_sku_option.id satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">,
              name: option.shopping_mall_sku_option.name,
              type: option.shopping_mall_sku_option.type,
            },
            candidate: {
              id: option.shopping_mall_sku_option_candidate.id satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">,
              value: option.shopping_mall_sku_option_candidate.value,
            },
            created_at: option.created_at ? toISOStringSafe(option.created_at) : undefined,
          }),
        )
      : undefined;

  return {
    id: fullCartItem.id satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">,
    shopping_cart_id: fullCartItem.shopping_mall_shopping_cart_id satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">,
    product: productSummary,
    quantity: fullCartItem.quantity,
    selected_options: selectedOptions,
    created_at: fullCartItem.created_at ? toISOStringSafe(fullCartItem.created_at) : undefined,
    updated_at: fullCartItem.updated_at ? toISOStringSafe(fullCartItem.updated_at) : undefined,
  };
}
