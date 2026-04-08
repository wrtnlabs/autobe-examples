import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartItemAtSummaryTransformer } from "../transformers/EcommerceMallCartItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCartItem.IRequest;
}): Promise<IPageIEcommerceMallCartItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ecommerce_mall_customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        {
          productVariant: {
            product: {
              name: {
                contains: props.body.search,
                mode: "insensitive" as const,
              },
            },
          },
        },
        {
          productVariant: {
            sku_code: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
        },
      ],
    }),
  } satisfies Prisma.ecommerce_mall_cart_itemsWhereInput;
  const orderByInput = (
    props.body.sort === "product_name"
      ? {
          productVariant: {
            product: {
              name: "asc" as const,
            },
          },
        }
      : props.body.sort === "price"
        ? {
            productVariant: {
              price: "asc" as const,
            },
          }
        : {
            created_at: "desc" as const,
          }
  ) satisfies Prisma.ecommerce_mall_cart_itemsOrderByWithRelationInput;
  const records = await MyGlobal.prisma.ecommerce_mall_cart_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallCartItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_cart_items.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallCartItemAtSummaryTransformer.transform,
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
// import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
// import { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallCustomerCartItems(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallCartItem.IRequest;
// }): Promise<IPageIEcommerceMallCartItem.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_cart_items.findMany({
//     ...EcommerceMallCartItemAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallCartItemAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------