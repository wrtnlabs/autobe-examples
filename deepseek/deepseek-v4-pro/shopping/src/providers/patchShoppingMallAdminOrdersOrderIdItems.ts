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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallOrderItemAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminOrdersOrderIdItems(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const whereInput = {
    shopping_mall_order_id: props.orderId,
    ...(props.body.status !== undefined &&
      props.body.status.length > 0 && {
        status: { in: props.body.status },
      }),
    ...((props.body.created_from !== undefined ||
      props.body.created_to !== undefined) && {
      created_at: {
        ...(props.body.created_from !== undefined && {
          gte: props.body.created_from,
        }),
        ...(props.body.created_to !== undefined && {
          lte: props.body.created_to,
        }),
      },
    }),
    ...(props.body.search !== undefined &&
      props.body.search.length > 0 && {
        OR: [
          { status: { contains: props.body.search } },
          {
            productVariant: {
              code: { contains: props.body.search },
            },
          },
        ],
      }),
  } satisfies Prisma.shopping_mall_order_itemsWhereInput;
  const orderByInput: Prisma.shopping_mall_order_itemsOrderByWithRelationInput =
    (() => {
      const sort: string | undefined = props.body.sort;
      if (sort !== undefined) {
        const parts: string[] = sort.split("_");
        const last: string | undefined = parts.pop();
        const direction: "asc" | "desc" = last === "desc" ? "desc" : "asc";
        const field: string = parts.join("_");
        if (field === "price") {
          return {
            price: direction,
          } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput;
        }
        if (field === "quantity") {
          return {
            quantity: direction,
          } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput;
        }
        if (field === "created_at") {
          return {
            created_at: direction,
          } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput;
        }
        if (field === "updated_at") {
          return {
            updated_at: direction,
          } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput;
        }
      }
      const defaultAsc: "asc" = "asc";
      return {
        created_at: defaultAsc,
      } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput;
    })();
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallOrderItemAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.shopping_mall_order_items.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
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
// export async function patchShoppingMallAdminOrdersOrderIdItems(props: {
//   admin: AdminPayload;
//   orderId: string & tags.Format<"uuid">;
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