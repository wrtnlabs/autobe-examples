import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartTransformer } from "../transformers/EcommerceMallCartTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerMeCart(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCartItem.ICreate;
}): Promise<IEcommerceMallCart> {
  // Validate variant exists and is not soft-deleted
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: props.body.productVariantId },
      select: { id: true, deleted_at: true, ecommerce_mall_product_id: true },
    });
  if (!variant) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.deleted_at !== null) {
    throw new HttpException("Variant is not available", 400);
  }
  // Validate parent product is not soft-deleted
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: variant.ecommerce_mall_product_id },
    select: { id: true, deleted_at: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.deleted_at !== null) {
    throw new HttpException("Variant is not available", 400);
  }
  // Validate customer account is active (not banned)
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findUnique({
    where: { id: props.customer.id },
    select: { id: true, deleted_at: true },
  });
  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }
  if (customer.deleted_at !== null) {
    throw new HttpException("Customer account is banned", 403);
  }
  // Get or create cart for customer
  let cart = await MyGlobal.prisma.ecommerce_mall_carts.findUnique({
    where: { ecommerce_mall_customer_id: props.customer.id },
    select: { id: true },
  });
  if (!cart) {
    cart = await MyGlobal.prisma.ecommerce_mall_carts.create({
      data: {
        id: v4() satisfies string & tags.Format<"uuid">,
        ecommerce_mall_customer_id: props.customer.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
      select: { id: true },
    });
  }
  // Check if variant already exists in cart using compound unique fields
  const existingItem =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findUnique({
      where: {
        ecommerce_mall_cart_id_ecommerce_mall_product_variant_id: {
          ecommerce_mall_cart_id: cart.id,
          ecommerce_mall_product_variant_id: props.body.productVariantId,
        },
      },
      select: { id: true, quantity: true },
    });
  if (existingItem) {
    // Update existing item quantity
    await MyGlobal.prisma.ecommerce_mall_cart_items.update({
      where: { id: existingItem.id },
      data: {
        quantity: existingItem.quantity + props.body.quantity,
        updated_at: new Date(),
      },
    });
  } else {
    // Create new cart item
    await MyGlobal.prisma.ecommerce_mall_cart_items.create({
      data: {
        id: v4() satisfies string & tags.Format<"uuid">,
        ecommerce_mall_cart_id: cart.id,
        ecommerce_mall_product_variant_id: props.body.productVariantId,
        quantity: props.body.quantity,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
  // Update cart timestamp
  await MyGlobal.prisma.ecommerce_mall_carts.update({
    where: { id: cart.id },
    data: { updated_at: new Date() },
  });
  // Fetch complete cart with all items using transformer
  const fullCart = await MyGlobal.prisma.ecommerce_mall_carts.findUniqueOrThrow(
    {
      where: { id: cart.id },
      ...EcommerceMallCartTransformer.select(),
    },
  );
  // Return transformed cart
  return await EcommerceMallCartTransformer.transform(fullCart);
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
// import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerMeCart(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallCartItem.ICreate;
// }): Promise<IEcommerceMallCart> {
//   const record = await MyGlobal.prisma.ecommerce_mall_cart_items.create({
//     data: await EcommerceMallCartItemCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallCartTransformer.select(),
//   });
//   return await EcommerceMallCartTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------