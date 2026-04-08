import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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
import { EcommerceMallCartItemCollector } from "../collectors/EcommerceMallCartItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartTransformer } from "../transformers/EcommerceMallCartTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCustomersCartItems(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCartItem.ICreate;
}): Promise<IEcommerceMallCart> {
  // 1. Get or create the customer's cart
  let cart = await MyGlobal.prisma.ecommerce_mall_carts.findUnique({
    where: { ecommerce_mall_customer_id: props.customer.id },
    select: { id: true },
  });
  if (cart === null) {
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
  // 2. Validate product variant exists and is not soft-deleted
  await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
    where: {
      id: props.body.productVariantId,
      deleted_at: null,
    },
  });
  // 3. Check for existing cart item with same variant
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
  // 4. Create or update cart item
  if (existingItem !== null) {
    await MyGlobal.prisma.ecommerce_mall_cart_items.update({
      where: { id: existingItem.id },
      data: {
        quantity: existingItem.quantity + props.body.quantity,
        updated_at: new Date(),
      },
    });
  } else {
    await MyGlobal.prisma.ecommerce_mall_cart_items.create({
      data: await EcommerceMallCartItemCollector.collect({
        body: props.body,
        cart: { id: cart.id } as IEntity,
      }),
    });
  }
  // 5. Update cart's updated_at timestamp
  await MyGlobal.prisma.ecommerce_mall_carts.update({
    where: { id: cart.id },
    data: { updated_at: new Date() },
  });
  // 6. Fetch and return the complete updated cart
  const completeCart =
    await MyGlobal.prisma.ecommerce_mall_carts.findUniqueOrThrow({
      where: { id: cart.id },
      ...EcommerceMallCartTransformer.select(),
    });
  return await EcommerceMallCartTransformer.transform(completeCart);
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
// import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerCustomersCartItems(props: {
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