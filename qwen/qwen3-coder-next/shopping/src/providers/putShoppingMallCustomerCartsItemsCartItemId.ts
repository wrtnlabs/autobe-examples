import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallShoppingCartTransformer } from "../transformers/ShoppingMallShoppingCartTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerCartsItemsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string;
  body: IShoppingMallShoppingCart.IUpdate;
}): Promise<IShoppingMallShoppingCart> {
  // Verify cart item belongs to customer
  const cartItem =
    await MyGlobal.prisma.shopping_mall_shopping_carts.findFirstOrThrow({
      where: {
        id: props.cartItemId,
        shopping_mall_customer_id: props.customer.id,
      },
      ...ShoppingMallShoppingCartTransformer.select(),
    });
  // Validate quantity against variant stock
  if (props.body.quantity > cartItem.variant.stock_quantity) {
    throw new HttpException("Quantity exceeds available stock", 400);
  }
  // Update cart item with new quantity and timestamp
  const updated = await MyGlobal.prisma.shopping_mall_shopping_carts.update({
    where: { id: props.cartItemId },
    data: {
      quantity: props.body.quantity,
      updated_at: new Date(),
    },
    ...ShoppingMallShoppingCartTransformer.select(),
  });
  return await ShoppingMallShoppingCartTransformer.transform(updated);
}
