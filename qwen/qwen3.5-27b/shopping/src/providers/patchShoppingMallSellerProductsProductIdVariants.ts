import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantAtSummaryTransformer } from "../transformers/ShoppingMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IRequest;
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        deleted_at: null,
        shopping_mall_seller_id: props.seller.id,
      },
      select: {
        base_price: true,
      },
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_product_variantsWhereInput = {
    shopping_mall_product_id: props.productId,
    deleted_at: null,
    ...(props.body.sku_code !== undefined && {
      sku_code: {
        contains: props.body.sku_code,
      },
    }),
    ...(props.body.price_min !== undefined && {
      OR: [
        {
          price: {
            gte: props.body.price_min,
          },
        },
        {
          price: null,
          product: {
            base_price: {
              gte: props.body.price_min,
            },
          },
        },
      ],
    }),
    ...(props.body.price_max !== undefined && {
      OR: [
        {
          price: {
            lte: props.body.price_max,
          },
        },
        {
          price: null,
          product: {
            base_price: {
              lte: props.body.price_max,
            },
          },
        },
      ],
    }),
    ...(props.body.in_stock === true && {
      inventoryRecords: {
        some: {
          deleted_at: null,
          quantity_change: {
            gt: 0,
          },
        },
      },
    }),
    ...(props.body.in_stock === false && {
      NOT: {
        inventoryRecords: {
          some: {
            deleted_at: null,
            quantity_change: {
              gt: 0,
            },
          },
        },
      },
    }),
  };
  const orderByInput: Prisma.shopping_mall_product_variantsOrderByWithRelationInput =
    (() => {
      const sortField = props.body.sort ?? "created_at";
      const sortOrder = typia.assert<Prisma.SortOrder>(
        props.body.order ?? "desc",
      );
      switch (sortField) {
        case "sku_code":
          return { sku_code: sortOrder };
        case "price":
          return { price: sortOrder };
        case "updated_at":
          return { updated_at: sortOrder };
        case "created_at":
        default:
          return { created_at: sortOrder };
      }
    })();
  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallProductVariantAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.shopping_mall_product_variants.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallProductVariantAtSummaryTransformer.transform,
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
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallSellerProductsProductIdVariants(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IShoppingMallProductVariant.IRequest;
// }): Promise<IPageIShoppingMallProductVariant.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_product_variants.findMany({
//     ...ShoppingMallProductVariantAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallProductVariantAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------