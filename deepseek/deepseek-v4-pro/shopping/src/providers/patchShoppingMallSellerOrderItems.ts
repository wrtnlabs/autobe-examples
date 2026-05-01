import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderItemAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerOrderItems(props: {
  seller: SellerPayload;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sellerScope: Prisma.shopping_mall_order_itemsWhereInput = {
    productVariant: {
      product: {
        shopping_mall_seller_id: props.seller.id,
      },
    },
  };
  const whereInput: Prisma.shopping_mall_order_itemsWhereInput = {};
  if (props.body.search) {
    whereInput.AND = [
      sellerScope,
      {
        OR: [
          {
            productVariant: {
              product: {
                name: { contains: props.body.search, mode: "insensitive" },
              },
            },
          },
          {
            productVariant: {
              code: { contains: props.body.search, mode: "insensitive" },
            },
          },
          {
            order: {
              code: { contains: props.body.search, mode: "insensitive" },
            },
          },
        ],
      },
    ];
  } else {
    Object.assign(whereInput, sellerScope);
  }
  if (props.body.status) {
    whereInput.status = { in: props.body.status };
  }
  if (props.body.order_id) {
    whereInput.shopping_mall_order_id = props.body.order_id;
  }
  if (props.body.created_from || props.body.created_to) {
    whereInput.created_at = {
      ...(props.body.created_from && {
        gte: new Date(props.body.created_from),
      }),
      ...(props.body.created_to && { lte: new Date(props.body.created_to) }),
    };
  }
  const orderBy: Prisma.shopping_mall_order_itemsOrderByWithRelationInput = {
    created_at: "desc",
  };
  const records = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
    ...ShoppingMallOrderItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_order_items.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallOrderItemAtSummaryTransformer.transform,
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
// import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
// import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallSellerOrderItems(props: {
//   seller: SellerPayload;
//   body: IShoppingMallOrderItem.IRequest;
// }): Promise<IPageIShoppingMallOrderItem.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_order_items.findMany({
//     ...ShoppingMallOrderItemAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallOrderItemAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------