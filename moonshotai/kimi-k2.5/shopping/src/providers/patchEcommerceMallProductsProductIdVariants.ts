import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductVariantAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProductsProductIdVariants(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.IRequest;
}): Promise<IPageIEcommerceMallProductVariant.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build base where conditions
  const baseWhere: Prisma.ecommerce_mall_product_variantsWhereInput = {
    product_id: props.productId,
    deleted_at: null,
  };
  // Add SKU search filter
  if (props.body.search) {
    baseWhere.sku_code = { contains: props.body.search, mode: "insensitive" };
  }
  // Add option filters
  if (props.body.optionName || props.body.optionValue) {
    baseWhere.variantOptions = {
      some: {
        ...(props.body.optionName && { option_name: props.body.optionName }),
        ...(props.body.optionValue && { option_value: props.body.optionValue }),
      },
    };
  }
  // Handle inStock filter - Get all variants with their inventory status
  if (props.body.inStock !== undefined) {
    // Get all variants for this product to calculate stock status
    const allVariants =
      await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
        where: { product_id: props.productId, deleted_at: null },
        select: { id: true },
      });
    const allVariantIds = allVariants.map((v) => v.id);
    // Get inventory totals for variants that have inventory records
    const inventoryRecords =
      await MyGlobal.prisma.ecommerce_mall_inventory_records.groupBy({
        by: ["product_variant_id"],
        where: { product_variant_id: { in: allVariantIds } },
        _sum: { quantity_change: true },
      });
    // Build a map of variant_id -> stock_quantity (default 0 for variants with no records)
    const stockMap = new Map<string, number>();
    for (const variantId of allVariantIds) {
      stockMap.set(variantId, 0);
    }
    for (const record of inventoryRecords) {
      stockMap.set(record.product_variant_id, record._sum.quantity_change ?? 0);
    }
    // Filter variant IDs based on stock status
    const filteredVariantIds = Array.from(stockMap.entries())
      .filter(([, quantity]) =>
        props.body.inStock ? quantity > 0 : quantity <= 0,
      )
      .map(([id]) => id);
    baseWhere.id = { in: filteredVariantIds };
  }
  // Get paginated results
  const records =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: baseWhere,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallProductVariantAtSummaryTransformer.select(),
    });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_product_variants.count({
    where: baseWhere,
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
      EcommerceMallProductVariantAtSummaryTransformer.transform,
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
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallProductsProductIdVariants(props: {
//   productId: string;
//   body: IEcommerceMallProductVariant.IRequest;
// }): Promise<IPageIEcommerceMallProductVariant.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
//     ...EcommerceMallProductVariantAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallProductVariantAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------