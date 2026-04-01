import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformCartItemCollector } from "../collectors/MallPlatformCartItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformCartItemTransformer } from "../transformers/MallPlatformCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformCustomerCartsItems(props: {
  customer: CustomerPayload;
  body: IMallPlatformCartItem.ICreate;
}): Promise<IMallPlatformCartItem> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const shoppingCart = await prisma.mall_platform_shopping_carts.findFirst({
      where: {
        mall_platform_customer_id: props.customer.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    const resolvedShoppingCart =
      shoppingCart !== null
        ? shoppingCart
        : await prisma.mall_platform_shopping_carts.create({
            data: {
              id: v4(),
              mall_platform_customer_id: props.customer.id,
              created_at: new Date(),
              updated_at: new Date(),
              deleted_at: null,
            },
            select: {
              id: true,
            },
          });
    const productVariant =
      await prisma.mall_platform_product_variants.findUniqueOrThrow({
        where: {
          id: props.body.mall_platform_product_variant_id,
        },
        select: {
          id: true,
          is_active: true,
          deleted_at: true,
          product: {
            select: {
              id: true,
              deleted_at: true,
            },
          },
        },
      });
    if (!productVariant.is_active || productVariant.deleted_at !== null) {
      throw new HttpException(
        "The selected product variant is not available for purchase.",
        400,
      );
    }
    if (productVariant.product.deleted_at !== null) {
      throw new HttpException(
        "The selected product is not available for purchase.",
        400,
      );
    }
    const existing = await prisma.mall_platform_cart_items.findFirst({
      where: {
        mall_platform_shopping_cart_id: resolvedShoppingCart.id,
        mall_platform_product_variant_id:
          props.body.mall_platform_product_variant_id,
        deleted_at: null,
      },
      select: {
        id: true,
        quantity: true,
      },
    });
    if (existing !== null) {
      const updated = await prisma.mall_platform_cart_items.update({
        where: {
          id: existing.id,
        },
        data: {
          quantity: existing.quantity + props.body.quantity,
          availability_state: "available",
          updated_at: new Date(),
        },
        ...MallPlatformCartItemTransformer.select(),
      });
      return await MallPlatformCartItemTransformer.transform(updated);
    }
    const created = await prisma.mall_platform_cart_items.create({
      data: await MallPlatformCartItemCollector.collect({
        body: props.body,
        shoppingCart: resolvedShoppingCart,
      }),
      ...MallPlatformCartItemTransformer.select(),
    });
    return await MallPlatformCartItemTransformer.transform(created);
  });
}
