import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { IMallPlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCartItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformShoppingCartItemCollector } from "../collectors/MallPlatformShoppingCartItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformShoppingCartItemTransformer } from "../transformers/MallPlatformShoppingCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformCustomerShoppingCartsCartItems(props: {
  customer: CustomerPayload;
  body: IMallPlatformShoppingCartItem.ICreate;
}): Promise<IMallPlatformShoppingCartItem> {
  const record = await MyGlobal.prisma.$transaction(async (prisma) => {
    const shoppingCart =
      await prisma.mall_platform_shopping_carts.findFirstOrThrow({
        where: {
          mall_platform_customer_id: props.customer.id,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    const productVariant =
      await prisma.mall_platform_product_variants.findUniqueOrThrow({
        where: {
          id: props.body.productVariantId,
        },
        select: {
          id: true,
          is_active: true,
          deleted_at: true,
          product: {
            select: {
              deleted_at: true,
            },
          },
        },
      });
    if (
      productVariant.deleted_at !== null ||
      productVariant.is_active === false ||
      productVariant.product.deleted_at !== null
    ) {
      throw new HttpException("Product variant is unavailable", 400);
    }
    const existing = await prisma.mall_platform_cart_items.findUnique({
      where: {
        mall_platform_shopping_cart_id_mall_platform_product_variant_id: {
          mall_platform_shopping_cart_id: shoppingCart.id,
          mall_platform_product_variant_id: productVariant.id,
        },
      },
      select: {
        id: true,
        quantity: true,
      },
    });
    if (existing !== null) {
      return await prisma.mall_platform_cart_items.update({
        where: {
          id: existing.id,
        },
        data: {
          quantity: existing.quantity + props.body.quantity,
        },
        ...MallPlatformShoppingCartItemTransformer.select(),
      });
    }
    return await prisma.mall_platform_cart_items.create({
      data: await MallPlatformShoppingCartItemCollector.collect({
        body: props.body,
        shoppingCart,
        productVariant,
      }),
      ...MallPlatformShoppingCartItemTransformer.select(),
    });
  });
  return await MallPlatformShoppingCartItemTransformer.transform(record);
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
// import { IMallPlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCartItem";
// import { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformCustomerShoppingCartsCartItems(props: {
//   customer: CustomerPayload;
//   body: IMallPlatformShoppingCartItem.ICreate;
// }): Promise<IMallPlatformShoppingCartItem> {
//   const record = await MyGlobal.prisma.mall_platform_cart_items.create({
//     data: await MallPlatformShoppingCartItemCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...MallPlatformShoppingCartItemTransformer.select(),
//   });
//   return await MallPlatformShoppingCartItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------