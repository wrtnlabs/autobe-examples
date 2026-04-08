import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformCartItemCollector } from "../collectors/MallPlatformCartItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformCartItemTransformer } from "../transformers/MallPlatformCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformCustomerCartsCartIdItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IMallPlatformCartItem.ICreate;
}): Promise<IMallPlatformCartItem> {
  const cart =
    await MyGlobal.prisma.mall_platform_shopping_carts.findUniqueOrThrow({
      where: { id: props.cartId },
      select: {
        id: true,
        mall_platform_customer_id: true,
      },
    });
  if (cart.mall_platform_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.mall_platform_product_variants.findUniqueOrThrow({
    where: { id: props.body.productVariantId },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  const existing = await MyGlobal.prisma.mall_platform_cart_items.findFirst({
    where: {
      mall_platform_shopping_cart_id: props.cartId,
      mall_platform_product_variant_id: props.body.productVariantId,
      deleted_at: null,
    },
    select: {
      id: true,
      quantity: true,
    },
  });
  if (existing !== null) {
    const updated = await MyGlobal.prisma.mall_platform_cart_items.update({
      where: { id: existing.id },
      data: {
        quantity: existing.quantity + props.body.quantity,
      },
      ...MallPlatformCartItemTransformer.select(),
    });
    return await MallPlatformCartItemTransformer.transform(updated);
  }
  try {
    const created = await MyGlobal.prisma.mall_platform_cart_items.create({
      data: await MallPlatformCartItemCollector.collect({
        body: props.body,
        shoppingCart: { id: props.cartId },
      }),
      ...MallPlatformCartItemTransformer.select(),
    });
    return await MallPlatformCartItemTransformer.transform(created);
  } catch (error: unknown) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    )
      throw error;
    const conflict =
      await MyGlobal.prisma.mall_platform_cart_items.findFirstOrThrow({
        where: {
          mall_platform_shopping_cart_id: props.cartId,
          mall_platform_product_variant_id: props.body.productVariantId,
          deleted_at: null,
        },
        select: {
          id: true,
          quantity: true,
        },
      });
    const merged = await MyGlobal.prisma.mall_platform_cart_items.update({
      where: { id: conflict.id },
      data: {
        quantity: conflict.quantity + props.body.quantity,
      },
      ...MallPlatformCartItemTransformer.select(),
    });
    return await MallPlatformCartItemTransformer.transform(merged);
  }
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
// import { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
// import { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformCustomerCartsCartIdItems(props: {
//   customer: CustomerPayload;
//   cartId: string & tags.Format<"uuid">;
//   body: IMallPlatformCartItem.ICreate;
// }): Promise<IMallPlatformCartItem> {
//   const record = await MyGlobal.prisma.mall_platform_cart_items.create({
//     data: await MallPlatformCartItemCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...MallPlatformCartItemTransformer.select(),
//   });
//   return await MallPlatformCartItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------