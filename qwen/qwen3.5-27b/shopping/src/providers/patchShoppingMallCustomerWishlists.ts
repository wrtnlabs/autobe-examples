import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerWishlist";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerWishlist";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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
import { ShoppingMallCustomerWishlistAtSummaryTransformer } from "../transformers/ShoppingMallCustomerWishlistAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerWishlist.IRequest;
}): Promise<IPageIShoppingMallCustomerWishlist.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.shopping_mall_customer_wishlistsWhereInput = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
  };
  // Build product where clause separately
  let productWhere: Prisma.shopping_mall_productsWhereInput = {
    deleted_at: null,
  };
  // Apply search filters
  if (props.body.search !== undefined && props.body.search !== "") {
    productWhere = {
      ...productWhere,
      name: {
        contains: props.body.search,
        mode: "insensitive",
      },
    };
  }
  if (props.body.category_id !== undefined) {
    productWhere = {
      ...productWhere,
      shopping_mall_category_id: props.body.category_id,
    };
  }
  if (props.body.min_price !== undefined) {
    productWhere = {
      ...productWhere,
      base_price: {
        gte: props.body.min_price,
      },
    };
  }
  if (props.body.max_price !== undefined) {
    productWhere = {
      ...productWhere,
      base_price: {
        lte: props.body.max_price,
      },
    };
  }
  whereInput.product = productWhere;
  // Handle cursor-based pagination
  let cursorWhere:
    | Prisma.shopping_mall_customer_wishlistsWhereInput
    | undefined;
  if (props.body.nextCursor !== undefined) {
    const [cursorCreatedAt, cursorId] = props.body.nextCursor.split("|");
    cursorWhere = {
      AND: [
        whereInput,
        {
          OR: [
            {
              created_at: {
                lt: new Date(cursorCreatedAt),
              },
            },
            {
              created_at: {
                equals: new Date(cursorCreatedAt),
              },
              id: {
                lt: cursorId,
              },
            },
          ],
        },
      ],
    };
  } else if (props.body.previousCursor !== undefined) {
    const [cursorCreatedAt, cursorId] = props.body.previousCursor.split("|");
    cursorWhere = {
      AND: [
        whereInput,
        {
          OR: [
            {
              created_at: {
                gt: new Date(cursorCreatedAt),
              },
            },
            {
              created_at: {
                equals: new Date(cursorCreatedAt),
              },
              id: {
                gt: cursorId,
              },
            },
          ],
        },
      ],
    };
  }
  const finalWhere = cursorWhere ?? whereInput;
  const data = await MyGlobal.prisma.shopping_mall_customer_wishlists.findMany({
    where: finalWhere,
    skip: cursorWhere ? 0 : skip,
    take: limit,
    orderBy: {
      created_at: "desc",
      id: "desc",
    },
    ...ShoppingMallCustomerWishlistAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_customer_wishlists.count({
    where: finalWhere,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallCustomerWishlistAtSummaryTransformer.transform,
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
// import { IShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerWishlist";
// import { IPageIShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerWishlist";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallCustomerWishlists(props: {
//   customer: CustomerPayload;
//   body: IShoppingMallCustomerWishlist.IRequest;
// }): Promise<IPageIShoppingMallCustomerWishlist.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_customer_wishlists.findMany({
//     ...ShoppingMallCustomerWishlistAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallCustomerWishlistAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------