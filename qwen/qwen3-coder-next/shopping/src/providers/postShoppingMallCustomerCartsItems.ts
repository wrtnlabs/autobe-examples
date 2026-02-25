import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCartItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallShoppingCartItemCollector } from "../collectors/ShoppingMallShoppingCartItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallShoppingCartItemTransformer } from "../transformers/ShoppingMallShoppingCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerCartsItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallShoppingCartItem.ICreate;
}): Promise<IShoppingMallShoppingCartItem> {
  // Verify variant exists, is not deleted, and has sufficient stock
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
      where: {
        id: props.body.variant_id,
        stock_quantity: {
          gte: props.body.quantity,
        },
        product: {
          is_deleted: false,
        },
      },
    });
  // Check if cart item already exists for same customer+variant
  const existingItem = await MyGlobal.prisma.shopping_mall_cart_items.findFirst(
    {
      where: {
        customer_id: props.customer.id,
        variant_id: props.body.variant_id,
      },
    },
  );
  // Prepare data for collector - combine quantities if item exists
  const quantityToUse = existingItem
    ? props.body.quantity + existingItem.quantity
    : props.body.quantity;
  // Validate combined quantity still available
  if (quantityToUse > variant.stock_quantity) {
    throw new HttpException(
      `Quantity exceeds available stock (${variant.stock_quantity})`,
      400,
    );
  }
  // Use collector to create cart item data
  const data = await ShoppingMallShoppingCartItemCollector.collect({
    body: { ...props.body, quantity: quantityToUse },
    customer: props.customer,
    variant,
  });
  // Create or update cart item
  const created = await MyGlobal.prisma.shopping_mall_cart_items.create({
    data,
    ...ShoppingMallShoppingCartItemTransformer.select(),
  });
  return await ShoppingMallShoppingCartItemTransformer.transform(created);
}
