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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProductsProductIdVariants(props: {
  productId: string;
  body: IEcommerceMallProductVariant.IRequest;
}): Promise<IPageIEcommerceMallProductVariant.ISummary> {
  // Verify product exists
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  // Build where clause for variants
  const variantWhere: Prisma.ecommerce_mall_product_variantsWhereInput = {
    product_id: props.productId,
    deleted_at: null, // Only show non-deleted variants
  };
  // Get all variants with their options and inventory records
  const variants =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: variantWhere,
      select: {
        id: true,
        sku_code: true,
        price: true,
        created_at: true,
        deleted_at: true,
        variantOptions: {
          select: {
            id: true,
            option_name: true,
            option_value: true,
          },
        },
        inventoryRecords: {
          select: {
            quantity_change: true,
          },
        },
      },
      orderBy: (() => {
        const direction: "asc" | "desc" =
          props.body.order === "asc" ? "asc" : "desc";
        switch (props.body.sort) {
          case "skuCode":
            return { sku_code: direction };
          case "price":
            return { price: direction };
          case "createdAt":
          default:
            return { created_at: direction };
        }
      })(),
      skip,
      take: limit,
    });
  // Get total count
  const totalCount =
    await MyGlobal.prisma.ecommerce_mall_product_variants.count({
      where: variantWhere,
    });
  // Transform and filter results
  const variantSummaries: IEcommerceMallProductVariant.ISummary[] = variants
    .map((variant) => {
      const currentStock = variant.inventoryRecords.reduce(
        (sum, record) => sum + record.quantity_change,
        0,
      );
      const isAvailable = currentStock > 0 && variant.deleted_at === null;
      // Apply availability filter if requested
      if (props.body.isAvailable && !isAvailable) {
        return null;
      }
      // Apply option filters
      const optionFilters = props.body.optionFilters;
      if (Object.keys(optionFilters).length > 0) {
        const matchesAllOptions = Object.entries(optionFilters).every(
          ([key, value]) =>
            variant.variantOptions.some(
              (opt) => opt.option_name === key && opt.option_value === value,
            ),
        );
        if (!matchesAllOptions) {
          return null;
        }
      }
      // Apply price filters
      const effectivePrice = variant.price;
      if (props.body.minPrice !== null) {
        if (effectivePrice === null || effectivePrice < props.body.minPrice) {
          return null;
        }
      }
      if (props.body.maxPrice !== null) {
        if (effectivePrice !== null && effectivePrice > props.body.maxPrice) {
          return null;
        }
      }
      const options: IEcommerceMallProductVariantOption.ISummary[] =
        variant.variantOptions.map((opt) => ({
          id: opt.id satisfies string & tags.Format<"uuid">,
          optionName: opt.option_name,
          optionValue: opt.option_value,
        }));
      return {
        id: variant.id satisfies string & tags.Format<"uuid">,
        skuCode: variant.sku_code,
        price: variant.price,
        options,
        currentStock: currentStock satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        isAvailable,
        createdAt: variant.created_at.toISOString(),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  // Get actual count after filters (note: this is approximate for paginated results)
  // For accurate pagination, filters should be applied in database query
  // Recalculate total with filters for accuracy
  const allVariants =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: variantWhere,
      select: {
        id: true,
        price: true,
        deleted_at: true,
        variantOptions: {
          select: {
            option_name: true,
            option_value: true,
          },
        },
        inventoryRecords: {
          select: {
            quantity_change: true,
          },
        },
      },
    });
  const filteredCount = allVariants.filter((variant) => {
    const currentStock = variant.inventoryRecords.reduce(
      (sum, record) => sum + record.quantity_change,
      0,
    );
    const isAvailable = currentStock > 0 && variant.deleted_at === null;
    // Apply availability filter
    if (props.body.isAvailable && !isAvailable) {
      return false;
    }
    // Apply option filters
    const optionFilters = props.body.optionFilters;
    if (Object.keys(optionFilters).length > 0) {
      const matchesAllOptions = Object.entries(optionFilters).every(
        ([key, value]) =>
          variant.variantOptions.some(
            (opt) => opt.option_name === key && opt.option_value === value,
          ),
      );
      if (!matchesAllOptions) {
        return false;
      }
    }
    // Apply price filters
    const effectivePrice = variant.price;
    if (props.body.minPrice !== null) {
      if (effectivePrice === null || effectivePrice < props.body.minPrice) {
        return false;
      }
    }
    if (props.body.maxPrice !== null) {
      if (effectivePrice !== null && effectivePrice > props.body.maxPrice) {
        return false;
      }
    }
    return true;
  }).length;
  const totalPages = Math.ceil(filteredCount / limit) || 1;
  return {
    data: variantSummaries,
    pagination: {
      current: page,
      limit: limit,
      records: filteredCount,
      pages: totalPages,
    } satisfies IPage.IPagination,
  };
}
