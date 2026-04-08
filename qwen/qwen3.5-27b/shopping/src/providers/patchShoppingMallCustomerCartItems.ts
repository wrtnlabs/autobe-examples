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

export async function patchShoppingMallCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerCartItem.IRequest;
}): Promise<IPageIShoppingMallCustomerCartItem.ISummary> {
  const { customer, body } = props;
  const cart = await MyGlobal.prisma.shopping_mall_customer_carts.findFirst({
    where: {
      shopping_mall_customer_id: customer.id,
    },
    select: { id: true },
  });
  if (cart === null) {
    return {
      pagination: {
        current: 1,
        limit: 20,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    };
  }
  const cartId = cart.id;
  const whereInput = {
    shopping_mall_customer_cart_id: cartId,
    deleted_at: null,
    ...(body.minQuantity !== undefined && {
      quantity: { gte: body.minQuantity },
    }),
    ...(body.maxQuantity !== undefined && {
      quantity: { lte: body.maxQuantity },
    }),
    ...(body.createdAtFrom !== undefined && {
      created_at: { gte: new Date(body.createdAtFrom) },
    }),
    ...(body.createdAtTo !== undefined && {
      created_at: { lte: new Date(body.createdAtTo) },
    }),
    ...(body.updatedAtFrom !== undefined && {
      updated_at: { gte: new Date(body.updatedAtFrom) },
    }),
    ...(body.updatedAtTo !== undefined && {
      updated_at: { lte: new Date(body.updatedAtTo) },
    }),
    ...(body.availableOnly === true && {
      productVariant: {
        deleted_at: null,
      },
    }),
  } satisfies Prisma.shopping_mall_customer_cart_itemsWhereInput;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortOrder = body.sortOrder ?? "DESC";
  const sortDirection = sortOrder === "ASC" ? "asc" : "desc";
  const sortBy = body.sortBy ?? "createdAt";
  const canSortInDatabase = ["createdAt", "updatedAt", "quantity"].includes(
    sortBy,
  );
  let orderBy:
    | Prisma.shopping_mall_customer_cart_itemsOrderByWithRelationInput
    | undefined;
  if (canSortInDatabase) {
    const dbField =
      sortBy === "createdAt"
        ? "created_at"
        : sortBy === "updatedAt"
          ? "updated_at"
          : "quantity";
    orderBy = { [dbField]: sortDirection };
  }
  const records =
    await MyGlobal.prisma.shopping_mall_customer_cart_items.findMany({
      where: whereInput,
      skip,
      take: limit,
      ...(orderBy && { orderBy }),
      select: {
        ...ShoppingMallCustomerCartItemAtSummaryTransformer.select().select,
        cart: true,
      },
    });
  const total = await MyGlobal.prisma.shopping_mall_customer_cart_items.count({
    where: whereInput,
  });
  let data = await ArrayUtil.asyncMap(
    records,
    ShoppingMallCustomerCartItemAtSummaryTransformer.transform,
  );
  if (!canSortInDatabase) {
    data = data.sort((a, b) => {
      let valA: string | number;
      let valB: string | number;
      switch (sortBy) {
        case "productName":
          valA = a.product.name;
          valB = b.product.name;
          break;
        case "skuCode":
          valA = a.productVariant.sku_code;
          valB = b.productVariant.sku_code;
          break;
        case "subtotal":
          valA = a.subtotal;
          valB = b.subtotal;
          break;
        default:
          valA = a.created_at;
          valB = b.created_at;
      }
      if (valA < valB) return sortOrder === "ASC" ? -1 : 1;
      if (valA > valB) return sortOrder === "ASC" ? 1 : -1;
      return 0;
    });
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
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
// export async function patchShoppingMallCustomerCartItems(props: {
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