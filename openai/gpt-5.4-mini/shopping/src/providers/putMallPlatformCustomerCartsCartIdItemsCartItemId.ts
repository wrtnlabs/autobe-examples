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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformCartItemTransformer } from "../transformers/MallPlatformCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformCustomerCartsCartIdItemsCartItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  cartItemId: string & tags.Format<"uuid">;
  body: IMallPlatformCartItem.IUpdate;
}): Promise<IMallPlatformCartItem> {
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    const cart = await prisma.mall_platform_shopping_carts.findUniqueOrThrow({
      where: { id: props.cartId },
      select: {
        id: true,
        mall_platform_customer_id: true,
      },
    });
    if (cart.mall_platform_customer_id !== props.customer.id) {
      throw new HttpException("Forbidden", 403);
    }
    const item = await prisma.mall_platform_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      select: {
        id: true,
        mall_platform_shopping_cart_id: true,
        mall_platform_product_variant_id: true,
        quantity: true,
        availability_state: true,
      },
    });
    if (item.mall_platform_shopping_cart_id !== props.cartId) {
      throw new HttpException("Forbidden", 403);
    }
    if (props.body.quantity !== undefined && props.body.quantity < 1) {
      throw new HttpException("Quantity must be positive", 400);
    }
    const productVariant =
      await prisma.mall_platform_product_variants.findUniqueOrThrow({
        where: { id: item.mall_platform_product_variant_id },
        select: {
          id: true,
          is_active: true,
        },
      });
    if (productVariant.is_active !== true) {
      throw new HttpException(
        "Product variant is not available for cart use",
        400,
      );
    }
    return await prisma.mall_platform_cart_items.update({
      where: { id: props.cartItemId },
      data: {
        ...(props.body.quantity !== undefined
          ? { quantity: props.body.quantity }
          : {}),
        availability_state: "available",
        updated_at: new Date(),
      },
      ...MallPlatformCartItemTransformer.select(),
    });
  });
  return await MallPlatformCartItemTransformer.transform(updated);
}
