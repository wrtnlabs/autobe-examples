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

export async function patchMallPlatformCustomerCartsActive(props: {
  customer: CustomerPayload;
  body: IMallPlatformShoppingCart.IRequest;
}): Promise<IPageIMallPlatformShoppingCart.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const existing =
    await MyGlobal.prisma.mall_platform_shopping_carts.findUnique({
      where: {
        mall_platform_customer_id: props.customer.id,
      },
      ...MallPlatformShoppingCartAtSummaryTransformer.select(),
    });
  const cart =
    existing ??
    (await MyGlobal.prisma.mall_platform_shopping_carts.create({
      data: {
        id: v4(),
        mall_platform_customer_id: props.customer.id,
        created_at: props.body.page ? new Date(0) : new Date(0),
        updated_at: props.body.limit ? new Date(0) : new Date(0),
        deleted_at: null,
      },
      ...MallPlatformShoppingCartAtSummaryTransformer.select(),
    }));
  const refreshed =
    existing === null
      ? cart
      : await MyGlobal.prisma.mall_platform_shopping_carts.update({
          where: {
            id: cart.id,
          },
          data: {
            updated_at: props.body.page ? new Date(0) : new Date(0),
          },
          ...MallPlatformShoppingCartAtSummaryTransformer.select(),
        });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: 1,
      pages: 1,
    },
    data: [
      await MallPlatformShoppingCartAtSummaryTransformer.transform(refreshed),
    ],
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
// import { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
// import { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
// import { IPageIMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShoppingCart";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformCustomerCartsActive(props: {
//   customer: CustomerPayload;
//   body: IMallPlatformShoppingCart.IRequest;
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