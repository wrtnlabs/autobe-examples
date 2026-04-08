import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartItemTransformer } from "../transformers/EcommerceMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerEcommerceMallCartItems(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCartItem.IRequest;
}): Promise<IEcommerceMallCartItem> {
  // Assert required body fields
  const variantId = typia.assert<string & tags.Format<"uuid">>(
    props.body.variantId,
  );
  const quantity = typia.assert<number & tags.Type<"int32"> & tags.Minimum<1>>(
    props.body.quantity,
  );
  // 1. Find or create customer cart (lazy creation on first item)
  let cart = await MyGlobal.prisma.ecommerce_mall_carts.findUnique({
    where: { ecommerce_mall_customer_id: props.customer.id },
  });
  if (!cart) {
    cart = await MyGlobal.prisma.ecommerce_mall_carts.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        ecommerce_mall_customer_id: props.customer.id,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  }
  // 2. Validate product variant exists and is not deleted
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: variantId },
      select: {
        id: true,
        deleted_at: true,
        price: true,
        quantity: true,
      },
    });
  if (!variant) {
    throw new HttpException("Product variant not found", 404);
  }
  if (variant.deleted_at !== null) {
    throw new HttpException("Product variant is no longer available", 400);
  }
  // 3. Check if cart item with same variant already exists
  const existingItem =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findUnique({
      where: {
        ecommerce_mall_cart_id_ecommerce_mall_product_variant_id: {
          ecommerce_mall_cart_id: cart.id,
          ecommerce_mall_product_variant_id: variantId,
        },
      },
    });
  let finalItemId: string;
  // 4. Update existing or create new cart item
  if (existingItem) {
    // Combine quantities when same variant exists
    await MyGlobal.prisma.ecommerce_mall_cart_items.update({
      where: { id: existingItem.id },
      data: {
        quantity: existingItem.quantity + quantity,
        updated_at: toISOStringSafe(new Date()),
      },
    });
    finalItemId = existingItem.id;
  } else {
    // Create new cart item directly
    const newItem = await MyGlobal.prisma.ecommerce_mall_cart_items.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        ecommerce_mall_cart_id: cart.id,
        ecommerce_mall_product_variant_id: variantId,
        quantity: quantity,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
    finalItemId = newItem.id;
  }
  // 5. Fetch the cart item with full data for response
  const cartItem =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findUniqueOrThrow({
      where: { id: finalItemId },
      ...EcommerceMallCartItemTransformer.select(),
    });
  // 6. Transform and return response
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
// import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerEcommerceMallCartItems(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallCartItem.IRequest;
// }): Promise<IEcommerceMallCartItem> {
//   const record = await MyGlobal.prisma.ecommerce_mall_cart_items.findFirstOrThrow({
//     ...EcommerceMallCartItemTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallCartItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------