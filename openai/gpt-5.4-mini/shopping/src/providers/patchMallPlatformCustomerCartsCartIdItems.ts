import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCartItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformCartItemAtSummaryTransformer } from "../transformers/MallPlatformCartItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerCartsCartIdItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IMallPlatformCartItem.IRequest;
}): Promise<IPageIMallPlatformCartItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
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
  const hasCartItemId = props.body.cartItemId !== undefined;
  const hasQuantity = props.body.quantity !== undefined;
  if (hasCartItemId !== hasQuantity) {
    throw new HttpException(
      "Both cartItemId and quantity are required for mutation",
      400,
    );
  }
  if (hasCartItemId && hasQuantity) {
    await MyGlobal.prisma.$transaction(async (prisma) => {
      const target = await prisma.mall_platform_cart_items.findUniqueOrThrow({
        where: { id: props.body.cartItemId },
        select: {
          id: true,
          mall_platform_shopping_cart_id: true,
        },
      });
      if (target.mall_platform_shopping_cart_id !== props.cartId) {
        throw new HttpException("Forbidden", 403);
      }
      await prisma.mall_platform_cart_items.update({
        where: { id: props.body.cartItemId },
        data: {
          quantity: props.body.quantity,
          updated_at: new Date(),
        },
      });
    });
  }
  const where = {
    mall_platform_shopping_cart_id: props.cartId,
    deleted_at: null,
  } satisfies Prisma.mall_platform_cart_itemsWhereInput;
  const records = await MyGlobal.prisma.mall_platform_cart_items.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...MallPlatformCartItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.mall_platform_cart_items.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformCartItemAtSummaryTransformer.transform,
    ),
  };
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
// import { IPageIMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCartItem";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformCustomerCartsCartIdItems(props: {
//   customer: CustomerPayload;
//   cartId: string & tags.Format<"uuid">;
//   body: IMallPlatformCartItem.IRequest;
// }): Promise<IPageIMallPlatformCartItem.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_cart_items.findMany({
//     ...MallPlatformCartItemAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformCartItemAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------