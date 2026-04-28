import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShoppingCartItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformShoppingCartItemCollector } from "../collectors/EcommercePlatformShoppingCartItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePlatformShoppingCartItemTransformer } from "../transformers/EcommercePlatformShoppingCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommercePlatformCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IEcommercePlatformShoppingCartItem.ICreate;
}): Promise<IEcommercePlatformShoppingCartItem> {
  const variant =
    await MyGlobal.prisma.ecommerce_platform_product_variants.findUniqueOrThrow(
      {
        where: { id: props.body.product_variant_id },
        select: { id: true, deleted_at: true },
      },
    );
  if (variant.deleted_at !== null) {
    throw new HttpException("Product variant is unavailable", 400);
  }
  const existing =
    await MyGlobal.prisma.ecommerce_platform_shopping_cart_items.findFirst({
      where: {
        ecommerce_platform_customer_id: props.customer.id,
        ecommerce_platform_product_variant_id: props.body.product_variant_id,
        deleted_at: null,
      },
      select: { id: true, quantity: true },
    });
  const record = existing
    ? await MyGlobal.prisma.ecommerce_platform_shopping_cart_items.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + props.body.quantity,
          updated_at: new Date(),
        },
        ...EcommercePlatformShoppingCartItemTransformer.select(),
      })
    : await MyGlobal.prisma.ecommerce_platform_shopping_cart_items.create({
        data: await EcommercePlatformShoppingCartItemCollector.collect({
          body: props.body,
          ecommercePlatformCustomers: { id: props.customer.id },
        }),
        ...EcommercePlatformShoppingCartItemTransformer.select(),
      });
  return await EcommercePlatformShoppingCartItemTransformer.transform(record);
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
// import { IEcommercePlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShoppingCartItem";
// import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
// import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommercePlatformCustomerCartItems(props: {
//   customer: CustomerPayload;
//   body: IEcommercePlatformShoppingCartItem.ICreate;
// }): Promise<IEcommercePlatformShoppingCartItem> {
//   const record = await MyGlobal.prisma.ecommerce_platform_shopping_cart_items.create({
//     data: await EcommercePlatformShoppingCartItemCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommercePlatformShoppingCartItemTransformer.select(),
//   });
//   return await EcommercePlatformShoppingCartItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------