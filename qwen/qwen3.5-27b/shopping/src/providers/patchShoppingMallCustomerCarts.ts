import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerCartItem";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerCartItemAtSummaryTransformer } from "../transformers/ShoppingMallCustomerCartItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerCarts(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerCartItem.IRequest;
}): Promise<IPageIShoppingMallCustomerCartItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortOrder = (props.body.sortOrder ?? "desc").toLowerCase() as
    | "asc"
    | "desc";
  const whereInput = {
    deleted_at: null,
    cart: {
      shopping_mall_customer_id: props.customer.id,
    },
    ...(props.body.availableOnly === true && {
      productVariant: {
        deleted_at: null,
      },
    }),
    ...(props.body.minQuantity !== undefined && {
      quantity: {
        gte: props.body.minQuantity,
      },
    }),
    ...(props.body.maxQuantity !== undefined && {
      quantity: {
        lte: props.body.maxQuantity,
      },
    }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: {
        gte: new Date(props.body.createdAtFrom),
      },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: {
        lte: new Date(props.body.createdAtTo),
      },
    }),
    ...(props.body.updatedAtFrom !== undefined && {
      updated_at: {
        gte: new Date(props.body.updatedAtFrom),
      },
    }),
    ...(props.body.updatedAtTo !== undefined && {
      updated_at: {
        lte: new Date(props.body.updatedAtTo),
      },
    }),
  } satisfies Prisma.shopping_mall_customer_cart_itemsWhereInput;
  const orderByInput = (
    props.body.sortBy === "quantity"
      ? { quantity: sortOrder }
      : props.body.sortBy === "subtotal"
        ? { quantity: sortOrder }
        : props.body.sortBy === "productName"
          ? {
              productVariant: {
                product: { name: sortOrder },
              },
            }
          : props.body.sortBy === "skuCode"
            ? { productVariant: { sku_code: sortOrder } }
            : { created_at: sortOrder }
  ) satisfies Prisma.shopping_mall_customer_cart_itemsOrderByWithRelationInput;
  const records =
    await MyGlobal.prisma.shopping_mall_customer_cart_items.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallCustomerCartItemAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.shopping_mall_customer_cart_items.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallCustomerCartItemAtSummaryTransformer.transform,
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
// import { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
// import { IPageIShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerCartItem";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallCustomerCarts(props: {
//   customer: CustomerPayload;
//   body: IShoppingMallCustomerCartItem.IRequest;
// }): Promise<IPageIShoppingMallCustomerCartItem.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_customer_cart_items.findMany({
//     ...ShoppingMallCustomerCartItemAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallCustomerCartItemAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------