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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformCartItemTransformer } from "../transformers/MallPlatformCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformCustomerCartsCartIdItemsCartItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  cartItemId: string & tags.Format<"uuid">;
  body: IMallPlatformCartItem.IUpdate;
}): Promise<IMallPlatformCartItem> {
  if (props.body.quantity === undefined) {
    throw new HttpException("Quantity is required.", 422);
  }
  if (props.body.quantity < 1) {
    throw new HttpException("Quantity must be at least 1.", 422);
  }
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    const cart = await prisma.mall_platform_shopping_carts.findUniqueOrThrow({
      where: { id: props.cartId },
      select: {
        id: true,
        mall_platform_customer_id: true,
      },
    });
    if (cart.mall_platform_customer_id !== props.customer.id) {
      throw new HttpException("Forbidden", 403);
    }
    const cartItem = await prisma.mall_platform_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      select: {
        id: true,
        mall_platform_shopping_cart_id: true,
      },
    });
    if (cartItem.mall_platform_shopping_cart_id !== props.cartId) {
      throw new HttpException("Not Found", 404);
    }
    await prisma.mall_platform_cart_items.update({
      where: { id: props.cartItemId },
      data: {
        quantity: props.body.quantity,
      },
    });
    return await prisma.mall_platform_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      ...MallPlatformCartItemTransformer.select(),
    });
  });
  return await MallPlatformCartItemTransformer.transform(updated);
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
// export async function putMallPlatformCustomerCartsCartIdItemsCartItemId(props: {
//   customer: CustomerPayload;
//   cartId: string & tags.Format<"uuid">;
//   cartItemId: string & tags.Format<"uuid">;
//   body: IMallPlatformCartItem.IUpdate;
// }): Promise<IMallPlatformCartItem> {
//   await MyGlobal.prisma.mall_platform_cart_items.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.mall_platform_cart_items.findUniqueOrThrow({
//     where: { ... },
//     ...MallPlatformCartItemTransformer.select(),
//   });
//   return await MallPlatformCartItemTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------