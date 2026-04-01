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

export async function putMallPlatformCustomerCartsItemsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string & tags.Format<"uuid">;
  body: IMallPlatformCartItem.IUpdate;
}): Promise<IMallPlatformCartItem> {
  if (props.body.quantity !== undefined && props.body.quantity < 1) {
    throw new HttpException("Quantity must be at least 1", 400);
  }
  const current =
    await MyGlobal.prisma.mall_platform_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      select: {
        id: true,
        deleted_at: true,
        mall_platform_shopping_cart_id: true,
        shoppingCart: {
          select: {
            id: true,
            mall_platform_customer_id: true,
            deleted_at: true,
          },
        },
        productVariant: {
          select: {
            id: true,
            is_active: true,
            deleted_at: true,
          },
        },
      },
    });
  if (current.deleted_at !== null) {
    throw new HttpException("Cart item has been deleted", 404);
  }
  if (current.shoppingCart.deleted_at !== null) {
    throw new HttpException("Cart not found", 404);
  }
  if (current.shoppingCart.mall_platform_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    current.productVariant.deleted_at !== null ||
    current.productVariant.is_active !== true
  ) {
    throw new HttpException("Selected product variant is unavailable", 400);
  }
  await MyGlobal.prisma.mall_platform_cart_items.update({
    where: { id: props.cartItemId },
    data: {
      ...(props.body.quantity !== undefined
        ? { quantity: props.body.quantity }
        : {}),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.mall_platform_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      ...MallPlatformCartItemTransformer.select(),
    });
  return await MallPlatformCartItemTransformer.transform(updated);
}
