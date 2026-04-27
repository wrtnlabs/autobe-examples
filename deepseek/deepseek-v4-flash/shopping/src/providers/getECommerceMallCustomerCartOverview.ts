import { IECommerceMallCartOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartOverview";
import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ECommerceMallProductVariantAtSummaryTransformer } from "../transformers/ECommerceMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getECommerceMallCustomerCartOverview(props: {
  customer: CustomerPayload;
}): Promise<IECommerceMallCartOverview> {
  const cartItem = await MyGlobal.prisma.e_commerce_mall_cart_items.findFirst({
    where: {
      e_commerce_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    orderBy: { created_at: "asc" },
    select: {
      id: true,
      quantity: true,
      created_at: true,
      e_commerce_mall_product_variant_id: true,
    },
  });
  if (cartItem === null) {
    throw new HttpException("Cart is empty", 404);
  }
  const variant =
    await MyGlobal.prisma.e_commerce_mall_product_variants.findFirstOrThrow({
      where: { id: cartItem.e_commerce_mall_product_variant_id },
      select: {
        ...ECommerceMallProductVariantAtSummaryTransformer.select().select,
        deleted_at: true,
      },
    });
  const transformedVariant =
    await ECommerceMallProductVariantAtSummaryTransformer.transform(variant);
  const unitPrice = transformedVariant.effective_price;
  const subtotal = unitPrice * cartItem.quantity;
  const stock = transformedVariant.stock;
  const available = variant.deleted_at === null && stock > 0;
  return {
    id: cartItem.id,
    product: transformedVariant.product,
    variant: transformedVariant,
    options: transformedVariant.options,
    quantity: cartItem.quantity,
    unit_price: unitPrice,
    subtotal: subtotal,
    available: available,
    created_at: cartItem.created_at.toISOString(),
  } satisfies IECommerceMallCartOverview;
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
// import { IECommerceMallCartOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartOverview";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getECommerceMallCustomerCartOverview(props: {
//   customer: CustomerPayload;
// }): Promise<IECommerceMallCartOverview> {
//   return {
//     id: ...,
//     product: await ECommerceMallProductAtSummaryTransformer.transform(...),
//     variant: await ECommerceMallProductVariantAtSummaryTransformer.transform(...),
//     options: ...,
//     quantity: ...,
//     unit_price: ...,
//     subtotal: ...,
//     available: ...,
//     created_at: ...,
//   };
// }
// ```
//--------------------------------------------------------------