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

export async function putEcommerceMallCustomerMeCart(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCart.IUpdate;
}): Promise<IEcommerceMallCart> {
  // Step 1: Find or create cart for the customer
  let cart = await MyGlobal.prisma.ecommerce_mall_carts.findUnique({
    where: { ecommerce_mall_customer_id: props.customer.id },
  });
  if (!cart) {
    // Create new cart if it doesn't exist
    cart = await MyGlobal.prisma.ecommerce_mall_carts.create({
      data: {
        id: v4(),
        ecommerce_mall_customer_id: props.customer.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
  // Step 2: Validate variant IDs if items are provided
  if (props.body.items && props.body.items.length > 0) {
    const variantIds = props.body.items.map((item) => item.productVariantId);
    // Check all variants exist and are not soft-deleted
    const variants =
      await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
        where: {
          id: { in: variantIds },
          deleted_at: null,
        },
        select: { id: true },
      });
    const validVariantIds = new Set(variants.map((v) => v.id));
    const invalidVariantIds = variantIds.filter(
      (id) => !validVariantIds.has(id),
    );
    if (invalidVariantIds.length > 0) {
      throw new HttpException(
        `Invalid or unavailable product variants: ${invalidVariantIds.join(", ")}`,
        400,
      );
    }
  }
  // Step 3: Use transaction to atomically clear and insert items
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Clear existing cart items
    await tx.ecommerce_mall_cart_items.deleteMany({
      where: { ecommerce_mall_cart_id: cart!.id },
    });
    // Insert new cart items if provided
    if (props.body.items && props.body.items.length > 0) {
      const now = new Date();
      const cartItemsData = props.body.items.map((item) => ({
        id: v4(),
        ecommerce_mall_cart_id: cart!.id,
        ecommerce_mall_product_variant_id: item.productVariantId,
        quantity: item.quantity,
        created_at: now,
        updated_at: now,
      }));
      await tx.ecommerce_mall_cart_items.createMany({
        data: cartItemsData,
      });
    }
    // Update cart's updated_at timestamp
    await tx.ecommerce_mall_carts.update({
      where: { id: cart!.id },
      data: { updated_at: new Date() },
    });
  });
  // Step 4: Fetch updated cart with transformer
  const updatedCart =
    await MyGlobal.prisma.ecommerce_mall_carts.findUniqueOrThrow({
      where: { id: cart.id },
      ...EcommerceMallCartTransformer.select(),
    });
  return await EcommerceMallCartTransformer.transform(updatedCart);
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
// import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
// import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallCustomerMeCart(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallCart.IUpdate;
// }): Promise<IEcommerceMallCart> {
//   await MyGlobal.prisma.ecommerce_mall_carts.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_carts.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallCartTransformer.select(),
//   });
//   return await EcommerceMallCartTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------