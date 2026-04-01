import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformShoppingCartTransformer } from "../transformers/MallPlatformShoppingCartTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformCustomerCartsCartId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IMallPlatformShoppingCart.IUpdate;
}): Promise<IMallPlatformShoppingCart> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const cart = await prisma.mall_platform_shopping_carts.findUnique({
      where: {
        id: props.cartId,
      },
      select: {
        id: true,
        mall_platform_customer_id: true,
      },
    });
    if (cart === null) {
      throw new HttpException("Shopping cart not found", 404);
    }
    if (cart.mall_platform_customer_id !== props.customer.id) {
      throw new HttpException("Forbidden", 403);
    }
    const merged = new Map<string, number>();
    for (const item of props.body.cartItems) {
      if (item.quantity < 1)
        throw new HttpException("Quantity must be at least 1", 400);
      const next =
        (merged.get(item.mall_platform_product_variant_id) ?? 0) +
        item.quantity;
      merged.set(item.mall_platform_product_variant_id, next);
    }
    const variantIds = Array.from(merged.keys());
    const variants =
      variantIds.length === 0
        ? []
        : await prisma.mall_platform_product_variants.findMany({
            where: {
              id: {
                in: variantIds,
              },
            },
            select: {
              id: true,
              is_active: true,
            },
          });
    if (variants.length !== variantIds.length) {
      throw new HttpException(
        "One or more product variants were not found",
        404,
      );
    }
    for (const variant of variants) {
      if (variant.is_active !== true) {
        throw new HttpException(
          "One or more product variants are unavailable",
          400,
        );
      }
    }
    await prisma.mall_platform_cart_items.deleteMany({
      where: {
        mall_platform_shopping_cart_id: props.cartId,
      },
    });
    for (const variantId of variantIds) {
      await prisma.mall_platform_cart_items.create({
        data: {
          id: v4(),
          mall_platform_shopping_cart_id: props.cartId,
          mall_platform_product_variant_id: variantId,
          quantity: merged.get(variantId) ?? 0,
          availability_state: "available",
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    }
    const updated = await prisma.mall_platform_shopping_carts.findUniqueOrThrow(
      {
        where: {
          id: props.cartId,
        },
        ...MallPlatformShoppingCartTransformer.select(),
      },
    );
    return await MallPlatformShoppingCartTransformer.transform(updated);
  });
}
