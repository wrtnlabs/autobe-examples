import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCartItemTransformer } from "../transformers/ShoppingMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: {
        id: props.body.shopping_mall_product_variant_id,
      },
      select: {
        id: true,
        shopping_mall_product_id: true,
        price: true,
        deleted_at: true,
        product: {
          select: {
            id: true,
            base_price: true,
            status: true,
            deleted_at: true,
          },
        },
      },
    });
  if (variant.deleted_at !== null)
    throw new HttpException("Variant is unavailable for cart placement", 409);
  if (variant.shopping_mall_product_id !== props.body.shopping_mall_product_id)
    throw new HttpException(
      "Variant does not belong to the supplied product",
      400,
    );
  if (variant.product.deleted_at !== null)
    throw new HttpException("Product is unavailable for cart placement", 409);
  if (variant.product.status !== "active")
    throw new HttpException("Product is unavailable for cart placement", 409);
  const persisted = await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.shopping_mall_cart_items.findUnique({
      where: {
        shopping_mall_customer_id_shopping_mall_product_variant_id: {
          shopping_mall_customer_id: props.customer.id,
          shopping_mall_product_variant_id: variant.id,
        },
      },
      select: {
        id: true,
        quantity: true,
      },
    });
    const now = new Date();
    if (existing === null)
      await tx.shopping_mall_cart_items.create({
        data: {
          id: v4(),
          quantity: props.body.quantity,
          unit_price: variant.price ?? variant.product.base_price,
          availability: true,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          customer: {
            connect: {
              id: props.customer.id,
            },
          },
          product: {
            connect: {
              id: variant.shopping_mall_product_id,
            },
          },
          productVariant: {
            connect: {
              id: variant.id,
            },
          },
        },
      });
    else
      await tx.shopping_mall_cart_items.update({
        where: {
          shopping_mall_customer_id_shopping_mall_product_variant_id: {
            shopping_mall_customer_id: props.customer.id,
            shopping_mall_product_variant_id: variant.id,
          },
        },
        data: {
          quantity: existing.quantity + props.body.quantity,
          unit_price: variant.price ?? variant.product.base_price,
          availability: true,
          updated_at: now,
          deleted_at: null,
          product: {
            connect: {
              id: variant.shopping_mall_product_id,
            },
          },
        },
      });
    return await tx.shopping_mall_cart_items.findUniqueOrThrow({
      where: {
        shopping_mall_customer_id_shopping_mall_product_variant_id: {
          shopping_mall_customer_id: props.customer.id,
          shopping_mall_product_variant_id: variant.id,
        },
      },
      ...ShoppingMallCartItemTransformer.select(),
    });
  });
  return await ShoppingMallCartItemTransformer.transform(persisted);
}
