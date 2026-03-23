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
import { ShoppingMallCartItemCollector } from "../collectors/ShoppingMallCartItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCartItemTransformer } from "../transformers/ShoppingMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerCustomersMeCartItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  const now = new Date();
  const existing = await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
    where: {
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    orderBy: { created_at: "desc" },
  });
  if (existing) {
    const updated = await MyGlobal.prisma.shopping_mall_cart_items.update({
      where: { id: existing.id },
      data: {
        quantity: existing.quantity + props.body.quantity,
        updated_at: now,
      },
      ...ShoppingMallCartItemTransformer.select(),
    });
    return await ShoppingMallCartItemTransformer.transform(updated);
  }
  const created = await MyGlobal.prisma.shopping_mall_cart_items.create({
    data: await ShoppingMallCartItemCollector.collect({
      body: props.body,
      shoppingMallCustomers: { id: props.customer.id },
      shoppingMallCustomerSessions: { id: props.customer.session_id },
    }),
    ...ShoppingMallCartItemTransformer.select(),
  });
  return await ShoppingMallCartItemTransformer.transform(created);
}
