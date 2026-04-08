import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCartItemCollector } from "../collectors/EcommerceMallCartItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartItemTransformer } from "../transformers/EcommerceMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerMeCartItems(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCartItem.ICreate;
}): Promise<IEcommerceMallCartItem> {
  // 1. Find or create cart for the customer
  let cart = await MyGlobal.prisma.ecommerce_mall_carts.findFirst({
    where: { ecommerce_mall_customer_id: props.customer.id },
    select: { id: true },
  });
  if (!cart) {
    cart = await MyGlobal.prisma.ecommerce_mall_carts.create({
      data: {
        id: v4(),
        ecommerce_mall_customer_id: props.customer.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
      select: { id: true },
    });
  }
  // 2. Validate variant exists and is not soft-deleted
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.body.productVariantId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!variant) {
    throw new HttpException("Variant not found or has been deleted", 404);
  }
  // 3. Check if cart item with same variant already exists
  const existingCartItem =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findFirst({
      where: {
        ecommerce_mall_cart_id: cart.id,
        ecommerce_mall_product_variant_id: props.body.productVariantId,
      },
      select: { id: true, quantity: true },
    });
  const now = new Date();
  let cartItem;
  if (existingCartItem) {
    // 4a. Update existing cart item - combine quantities
    const newQuantity = existingCartItem.quantity + props.body.quantity;
    cartItem = await MyGlobal.prisma.ecommerce_mall_cart_items.update({
      where: { id: existingCartItem.id },
      data: {
        quantity: newQuantity,
        updated_at: now,
      },
      ...EcommerceMallCartItemTransformer.select(),
    });
    // Update cart's updated_at
    await MyGlobal.prisma.ecommerce_mall_carts.update({
      where: { id: cart.id },
      data: { updated_at: now },
    });
  } else {
    // 4b. Create new cart item using Collector
    const created = await MyGlobal.prisma.ecommerce_mall_cart_items.create({
      data: await EcommerceMallCartItemCollector.collect({
        body: props.body,
        ecommerceMallCarts: cart as IEntity,
      }),
      ...EcommerceMallCartItemTransformer.select(),
    });
    // Update cart's updated_at
    await MyGlobal.prisma.ecommerce_mall_carts.update({
      where: { id: cart.id },
      data: { updated_at: now },
    });
    cartItem = created;
  }
  // 5. Return the cart item with variant and product details
  return await EcommerceMallCartItemTransformer.transform(cartItem);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerMeCartItems(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallCartItem.ICreate;
// }): Promise<IEcommerceMallCartItem> {
//   const record = await MyGlobal.prisma.ecommerce_mall_cart_items.create({
//     data: await EcommerceMallCartItemCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallCartItemTransformer.select(),
//   });
//   return await EcommerceMallCartItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------