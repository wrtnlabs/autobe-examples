import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.ISRequest;
}): Promise<IPageIEcommerceMallProductVariant.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  // Build WHERE conditions
  const whereInput: Prisma.ecommerce_mall_product_variantsWhereInput = {
    product_id: props.productId,
    deleted_at: null,
  };
  // Apply stock_status filter
  if (props.body.stock_status === "in_stock") {
    whereInput.stock_quantity = { gt: 0 };
  } else if (props.body.stock_status === "out_of_stock") {
    whereInput.stock_quantity = { equals: 0 };
  }
  // Apply active_status filter
  if (props.body.active_status === "active") {
    whereInput.is_active = true;
  } else if (props.body.active_status === "inactive") {
    whereInput.is_active = false;
  }
  // Apply sku_pattern filter (case-insensitive ILIKE)
  if (props.body.sku_pattern !== undefined && props.body.sku_pattern !== null) {
    whereInput.sku_code = {
      contains: props.body.sku_pattern,
      mode: "insensitive",
    };
  }
  // Build ORDER BY with default created_at DESC
  const orderByInput: Prisma.ecommerce_mall_product_variantsOrderByWithRelationInput[] =
    [];
  if (props.body.sort_by !== undefined) {
    switch (props.body.sort_by) {
      case "stock_quantity":
        orderByInput.push({
          stock_quantity: props.body.sort_direction === "asc" ? "asc" : "desc",
        });
        break;
      case "price_override":
        orderByInput.push({
          price_override: props.body.sort_direction === "asc" ? "asc" : "desc",
        });
        break;
      case "created_at":
        orderByInput.push({
          created_at: props.body.sort_direction === "asc" ? "asc" : "desc",
        });
        break;
      case "sku_code":
        orderByInput.push({
          sku_code: props.body.sort_direction === "asc" ? "asc" : "desc",
        });
        break;
      default:
        orderByInput.push({
          created_at: props.body.sort_direction === "asc" ? "asc" : "desc",
        });
    }
  } else {
    orderByInput.push({
      created_at: props.body.sort_direction === "asc" ? "asc" : "desc",
    });
  }
  // Handle price filtering with base_price join
  // Since price_override can be null and fall back to base_price, we need to fetch products
  // and filter in-memory or use a more complex query
  const priceFilterApplied =
    props.body.min_price !== undefined || props.body.max_price !== undefined;
  const variantsData =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: whereInput,
      include: {
        product: {
          include: {
            seller: true,
            category: true,
          },
        },
      },
      orderBy: orderByInput,
    });
  // Apply price filter and pagination
  const filteredVariants = variantsData.filter((variant) => {
    if (!priceFilterApplied) return true;
    const effectivePrice = variant.price_override ?? variant.product.base_price;
    if (
      props.body.min_price !== undefined &&
      effectivePrice < props.body.min_price
    ) {
      return false;
    }
    if (
      props.body.max_price !== undefined &&
      effectivePrice > props.body.max_price
    ) {
      return false;
    }
    return true;
  });
  // Calculate pagination
  const total = filteredVariants.length;
  const skip = (page - 1) * limit;
  const paginatedVariants = filteredVariants.slice(skip, skip + limit);
  // Transform to response DTO
  const data = await Promise.all(
    paginatedVariants.map((variant) => {
      const effectivePrice =
        variant.price_override ?? variant.product.base_price;
      return {
        id: variant.id,
        skuCode: variant.sku_code,
        product: {
          id: variant.product.id,
          name: variant.product.name,
          description: variant.product.description,
          base_price: variant.product.base_price,
          is_active: variant.product.is_active,
          created_at: toISOStringSafe(variant.product.created_at),
          seller: {
            id: variant.product.seller_id,
            email: variant.product.seller.email,
            approval_status: variant.product.seller.approval_status as
              | "pending"
              | "approved"
              | "rejected",
            rejection_reason: variant.product.seller.rejection_reason,
            is_suspended: variant.product.seller.is_suspended,
            is_banned: variant.product.seller.is_banned,
            created_at: toISOStringSafe(variant.product.seller.created_at),
          } satisfies IEcommerceMallSeller.ISummary,
          category: {
            id: variant.product.category_id,
            name: variant.product.category.name,
            is_leaf: variant.product.category.is_leaf,
            parent: null as any,
            created_at: toISOStringSafe(variant.product.category.created_at),
            updated_at: toISOStringSafe(variant.product.category.updated_at),
            deleted_at: variant.product.category.deleted_at
              ? toISOStringSafe(variant.product.category.deleted_at)
              : null,
          } satisfies IEcommerceMallCategory.ISummary,
        } satisfies IEcommerceMallProduct.ISummary,
        stockQuantity: variant.stock_quantity,
        isActive: variant.is_active,
        priceOverride: variant.price_override,
        displayPrice: effectivePrice,
      };
    }),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  };
}
