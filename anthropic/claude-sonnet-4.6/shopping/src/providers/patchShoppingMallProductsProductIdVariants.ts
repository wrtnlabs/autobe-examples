import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductVariantAtSummaryTransformer } from "../transformers/ShoppingMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductsProductIdVariants(props: {
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IRequest;
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  // 1. Verify product exists (not deleted)
  const product = await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow(
    {
      where: {
        id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        base_price: true,
      },
    },
  );
  // 2. Build option-filter AND conditions (conjunctive: all pairs must match)
  const body = props.body;
  const optionFilterConditions: Prisma.shopping_mall_product_variantsWhereInput[] =
    body.optionFilters != null && body.optionFilters.length > 0
      ? body.optionFilters.map((f) => ({
          options: {
            some: {
              ...(f.key !== undefined && { key: f.key }),
              ...(f.value !== undefined && { value: f.value }),
            },
          },
        }))
      : [];
  // 3. Build composite Prisma WHERE clause
  const whereInput = {
    shopping_mall_product_id: props.productId,
    deleted_at: null,
    ...(body.skuKeyword != null && {
      sku: { contains: body.skuKeyword, mode: "insensitive" as const },
    }),
    ...(optionFilterConditions.length > 0 && {
      AND: optionFilterConditions,
    }),
  } satisfies Prisma.shopping_mall_product_variantsWhereInput;
  // 4. Fetch all matching variants with transformer select
  //    (no DB-level pagination yet: inStockOnly and effective-price filters need JS-side processing)
  const rawVariants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: whereInput,
      ...ShoppingMallProductVariantAtSummaryTransformer.select(),
    });
  // 5. Transform all variants to ISummary DTOs
  const allTransformed = await ArrayUtil.asyncMap(
    rawVariants,
    ShoppingMallProductVariantAtSummaryTransformer.transform,
  );
  // 6. Apply JS-side filters (inStockOnly, priceMin, priceMax)
  //    Effective price = price_override ?? product.base_price (constant for all variants of this product)
  const basePrice = product.base_price;
  const filtered = allTransformed.filter((variant) => {
    if (body.inStockOnly === true && !variant.inStock) {
      return false;
    }
    const effectivePrice = variant.price_override ?? basePrice;
    if (body.priceMin != null && effectivePrice < body.priceMin) {
      return false;
    }
    if (body.priceMax != null && effectivePrice > body.priceMax) {
      return false;
    }
    return true;
  });
  // 7. Sort (JS-side to support effective-price ordering)
  const sortField = body.sortField ?? "created_at";
  const sortOrder = body.sortOrder ?? "desc";
  const sortMultiplier = sortOrder === "asc" ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => {
    if (sortField === "sku") {
      return sortMultiplier * a.sku.localeCompare(b.sku);
    } else if (sortField === "price") {
      const priceA = a.price_override ?? basePrice;
      const priceB = b.price_override ?? basePrice;
      return sortMultiplier * (priceA - priceB);
    } else {
      // "created_at" — ISO strings are lexicographically sortable
      return (
        sortMultiplier *
        (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0)
      );
    }
  });
  // 8. Apply offset pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  const totalRecords = sorted.length;
  const paginatedData = sorted.slice(skip, skip + limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit),
    } satisfies IPage.IPagination,
    data: paginatedData,
  };
}
