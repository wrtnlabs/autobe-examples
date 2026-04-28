import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformProductVariantAtSummaryTransformer } from "../transformers/EcommercePlatformProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformProductsProductIdVariants(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommercePlatformProductVariant.IRequest;
}): Promise<IPageIEcommercePlatformProductVariant.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build complex WHERE clause components
  const whereClause: Record<string, unknown> = {
    deleted_at: null,
    ecommerce_platform_product_id: props.productId,
  };
  // SKU code text search filter
  if (props.body.search !== undefined && props.body.search !== "") {
    whereClause.sku_code = { contains: props.body.search };
  }
  // Price range filtering with fallback to product base_price when variant price is null
  const { priceMin, priceMax } = props.body;
  if (priceMin !== undefined || priceMax !== undefined) {
    whereClause.OR = [
      {
        price: {
          ...(priceMin !== undefined && { gte: priceMin }),
          ...(priceMax !== undefined && { lte: priceMax }),
        },
      },
      {
        AND: [
          { price: null },
          {
            product: {
              base_price: {
                ...(priceMin !== undefined && { gte: priceMin }),
                ...(priceMax !== undefined && { lte: priceMax }),
              },
            },
          },
        ],
      },
    ];
  }
  // Fetch all matching variants with transformer select
  const allVariants =
    await MyGlobal.prisma.ecommerce_platform_product_variants.findMany({
      where: whereClause,
      ...EcommercePlatformProductVariantAtSummaryTransformer.select(),
    });
  // Apply inStock filter client-side (Prisma cannot HAVING by SUM in findMany)
  let filteredVariants = allVariants;
  if (props.body.inStock !== undefined) {
    const wantsInStock = props.body.inStock;
    filteredVariants = allVariants.filter((variant) => {
      const stock = variant.inventoryRecords.reduce(
        (sum, rec) => sum + rec.quantity_delta,
        0,
      );
      return wantsInStock ? stock > 0 : stock <= 0;
    });
  }
  // Paginate the filtered results
  const total = filteredVariants.length;
  const pageData = filteredVariants.slice(skip, skip + limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      pageData,
      EcommercePlatformProductVariantAtSummaryTransformer.transform,
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
// import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
// import { IPageIEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformProductVariant";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformProductsProductIdVariants(props: {
//   productId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformProductVariant.IRequest;
// }): Promise<IPageIEcommercePlatformProductVariant.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_product_variants.findMany({
//     ...EcommercePlatformProductVariantAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformProductVariantAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------