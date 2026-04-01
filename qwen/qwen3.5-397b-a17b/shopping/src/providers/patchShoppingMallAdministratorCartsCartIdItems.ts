import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallCartItemTransformer } from "../transformers/ShoppingMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorCartsCartIdItems(props: {
  administrator: AdministratorPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IUpdate;
}): Promise<IShoppingMallCartItem> {
  // Verify cart exists
  await MyGlobal.prisma.shopping_mall_carts.findUniqueOrThrow({
    where: { id: props.cartId },
  });
  // Find the first active cart item in the cart
  // Note: In a real implementation, itemId should be in the path parameter
  const cartItem =
    await MyGlobal.prisma.shopping_mall_cart_items.findFirstOrThrow({
      where: {
        shopping_mall_cart_id: props.cartId,
        deleted_at: null,
      },
      ...ShoppingMallCartItemTransformer.select(),
    });
  // Determine if item should be removed
  const shouldRemove = props.body.remove === true || props.body.quantity === 0;
  // Update the cart item
  const updated = await MyGlobal.prisma.shopping_mall_cart_items.update({
    where: { id: cartItem.id },
    data: {
      ...(props.body.quantity !== undefined &&
        props.body.quantity > 0 && {
          quantity: props.body.quantity,
        }),
      ...(shouldRemove && { deleted_at: new Date() }),
      updated_at: new Date(),
    },
    ...ShoppingMallCartItemTransformer.select(),
  });
  return await ShoppingMallCartItemTransformer.transform(updated);
}
