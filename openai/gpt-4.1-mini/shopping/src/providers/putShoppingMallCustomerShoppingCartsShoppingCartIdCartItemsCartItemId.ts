import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCartItemSelectedOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSelectedOptions";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";
import { IShoppingMallSkuAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttributeValue";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerShoppingCartsShoppingCartIdCartItemsCartItemId(props: {
  customer: CustomerPayload;
  shoppingCartId: string & tags.Format<"uuid">;
  cartItemId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IUpdate;
}): Promise<IShoppingMallCartItem> {
  const existing = await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
    where: {
      id: props.cartItemId,
      shopping_mall_shopping_cart_id: props.shoppingCartId,
      deleted_at: null,
    },
  });

  if (!existing) {
    throw new HttpException("Cart item not found", 404);
  }

  await MyGlobal.prisma.$transaction(async (tx) => {
    if (props.body.selected_options !== undefined) {
      await tx.shopping_mall_cart_item_selected_options.deleteMany({
        where: { shopping_cart_item_id: props.cartItemId },
      });

      for (const option of props.body.selected_options) {
        await tx.shopping_mall_cart_item_selected_options.create({
          data: {
            id: v4(),
            shopping_cart_item_id: props.cartItemId,
            shopping_mall_product_sku_option_id: option.option_id,
            shopping_mall_product_sku_option_candidate_id: option.candidate_id,
            created_at: toISOStringSafe(new Date()),
          },
        });
      }
    }

    await tx.shopping_mall_cart_items.update({
      where: { id: props.cartItemId },
      data: {
        ...(props.body.quantity !== undefined && {
          quantity: props.body.quantity,
        }),
      },
    });
  });

  // Re-fetch updated cart item without includes due to Prisma client limitations
  const updated = await MyGlobal.prisma.shopping_mall_cart_items.findUnique({
    where: { id: props.cartItemId },
  });

  if (!updated) {
    throw new HttpException("Cart item not found after update", 404);
  }

  // Fetch related product manually
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: updated.shopping_mall_product_id },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  // Fetch selected options manually
  const selectedOptions =
    await MyGlobal.prisma.shopping_mall_cart_item_selected_options.findMany({
      where: { shopping_cart_item_id: props.cartItemId },
      include: {
        shopping_mall_product_sku_option: true,
        shopping_mall_product_sku_option_candidate: true,
      },
    });

  return {
    id: updated.id,
    shopping_cart_id:
      updated.shopping_mall_shopping_cart_id satisfies string as string,
    product: {
      id: product.id satisfies string as string,
      code: product.code satisfies string as string,
      name: product.name satisfies string as string,
      is_active: product.is_active satisfies boolean as boolean,
      created_at: toISOStringSafe(product.created_at),
      updated_at: toISOStringSafe(product.updated_at),
      deleted_at: product.deleted_at
        ? toISOStringSafe(product.deleted_at)
        : null,
    },
    quantity: updated.quantity satisfies number as number,
    selected_options: selectedOptions.map(
      (opt: {
        id: string;
        shopping_mall_product_sku_option: {
          id: string;
          name: string;
          type: string;
        };
        shopping_mall_product_sku_option_candidate: {
          id: string;
          value: string;
        };
        created_at: Date | null;
      }) => ({
        id: opt.id satisfies string as string,
        option: {
          id: opt.shopping_mall_product_sku_option
            .id satisfies string as string,
          name: opt.shopping_mall_product_sku_option
            .name satisfies string as string,
          type: opt.shopping_mall_product_sku_option
            .type satisfies string as string,
        },
        candidate: {
          id: opt.shopping_mall_product_sku_option_candidate
            .id satisfies string as string,
          value: opt.shopping_mall_product_sku_option_candidate
            .value satisfies string as string,
        },
        created_at: opt.created_at
          ? toISOStringSafe(opt.created_at)
          : undefined,
      }),
    ),
    created_at: updated.created_at
      ? toISOStringSafe(updated.created_at)
      : undefined,
    updated_at: updated.updated_at
      ? toISOStringSafe(updated.updated_at)
      : undefined,
  } satisfies IShoppingMallCartItem;
}
