import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShoppingCartItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformShoppingCartItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePlatformShoppingCartItemAtSummaryTransformer } from "../transformers/EcommercePlatformShoppingCartItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IEcommercePlatformShoppingCartItem.IRequest;
}): Promise<IPageIEcommercePlatformShoppingCartItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    ecommercePlatformCustomer: { id: props.customer.id },
    deleted_at: null,
    ...(props.body.variant_id !== undefined && {
      ecommercePlatformProductVariant: { id: props.body.variant_id },
    }),
  } satisfies Prisma.ecommerce_platform_shopping_cart_itemsWhereInput;
  const orderByInput = (
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" as const }
      : props.body.sort === "created_at_desc"
        ? { created_at: "desc" as const }
        : props.body.sort === "quantity_asc"
          ? { quantity: "asc" as const }
          : props.body.sort === "quantity_desc"
            ? { quantity: "desc" as const }
            : props.body.sort === "updated_at_asc"
              ? { updated_at: "asc" as const }
              : props.body.sort === "updated_at_desc"
                ? { updated_at: "desc" as const }
                : { created_at: "desc" as const }
  ) satisfies Prisma.ecommerce_platform_shopping_cart_itemsOrderByWithRelationInput;
  const records =
    await MyGlobal.prisma.ecommerce_platform_shopping_cart_items.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommercePlatformShoppingCartItemAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_platform_shopping_cart_items.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      EcommercePlatformShoppingCartItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
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
// import { IEcommercePlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShoppingCartItem";
// import { IPageIEcommercePlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformShoppingCartItem";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformCustomerCartItems(props: {
//   customer: CustomerPayload;
//   body: IEcommercePlatformShoppingCartItem.IRequest;
// }): Promise<IPageIEcommercePlatformShoppingCartItem.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_shopping_cart_items.findMany({
//     ...EcommercePlatformShoppingCartItemAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformShoppingCartItemAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------