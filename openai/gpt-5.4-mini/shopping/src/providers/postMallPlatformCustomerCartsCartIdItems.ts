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

export async function postMallPlatformCustomerCartsCartIdItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IMallPlatformCartItem.ICreate;
}): Promise<IMallPlatformCartItem> {
  const cart =
    await MyGlobal.prisma.mall_platform_shopping_carts.findUniqueOrThrow({
      where: {
        id: props.cartId,
      },
      select: {
        id: true,
        mall_platform_customer_id: true,
      },
    });
  if (cart.mall_platform_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const variant =
    await MyGlobal.prisma.mall_platform_product_variants.findUniqueOrThrow({
      where: {
        id: props.body.mall_platform_product_variant_id,
      },
      select: {
        id: true,
        is_active: true,
      },
    });
  const availabilityState = variant.is_active ? "available" : "unavailable";
  const cartItem = await MyGlobal.prisma.$transaction(async (prisma) => {
    const existing = await prisma.mall_platform_cart_items.findFirst({
      where: {
        mall_platform_shopping_cart_id: cart.id,
        mall_platform_product_variant_id: variant.id,
        deleted_at: null,
      },
      select: {
        id: true,
        quantity: true,
      },
    });
    if (existing !== null) {
      await prisma.mall_platform_cart_items.update({
        where: {
          id: existing.id,
        },
        data: {
          quantity: existing.quantity + props.body.quantity,
          availability_state: availabilityState,
        },
      });
      return await prisma.mall_platform_cart_items.findUniqueOrThrow({
        where: {
          id: existing.id,
        },
        ...MallPlatformCartItemTransformer.select(),
      });
    }
    return await prisma.mall_platform_cart_items.create({
      data: await MallPlatformCartItemCollector.collect({
        body: props.body,
        shoppingCart: cart,
      }),
      ...MallPlatformCartItemTransformer.select(),
    });
  });
  return await MallPlatformCartItemTransformer.transform(cartItem);
}
