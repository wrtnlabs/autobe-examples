import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShoppingCart";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformShoppingCartAtSummaryTransformer } from "../transformers/MallPlatformShoppingCartAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerShoppingCartsCartItems(props: {
  customer: CustomerPayload;
  body: IMallPlatformCartItem.IRequest;
}): Promise<IPageIMallPlatformShoppingCart.ISummary> {
  const page: number =
    props.body.page === undefined || props.body.page === null
      ? 1
      : props.body.page;
  const limit: number =
    props.body.limit === undefined || props.body.limit === null
      ? 100
      : props.body.limit;
  const skip: number = (page - 1) * limit;
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const cart = await prisma.mall_platform_shopping_carts.findFirstOrThrow({
      where: {
        mall_platform_customer_id: props.customer.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    await prisma.mall_platform_cart_items.findFirstOrThrow({
      where: {
        id: props.body.id,
        mall_platform_shopping_cart_id: cart.id,
      },
      select: {
        id: true,
      },
    });
    await prisma.mall_platform_cart_items.update({
      where: {
        id: props.body.id,
      },
      data: {
        quantity: props.body.quantity,
      },
    });
    const where: Prisma.mall_platform_shopping_cartsWhereInput = {
      mall_platform_customer_id: props.customer.id,
      deleted_at: null,
    };
    const records = await prisma.mall_platform_shopping_carts.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      ...MallPlatformShoppingCartAtSummaryTransformer.select(),
    });
    const total = await prisma.mall_platform_shopping_carts.count({
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
        MallPlatformShoppingCartAtSummaryTransformer.transform,
      ),
    } satisfies IPageIMallPlatformShoppingCart.ISummary;
  });
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
// import { IPageIMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShoppingCart";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformCustomerShoppingCartsCartItems(props: {
//   customer: CustomerPayload;
//   body: IMallPlatformCartItem.IRequest;
// }): Promise<IPageIMallPlatformShoppingCart.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_shopping_carts.findMany({
//     ...MallPlatformShoppingCartAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformShoppingCartAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------