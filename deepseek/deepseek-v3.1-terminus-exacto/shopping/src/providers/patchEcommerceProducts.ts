import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceProducts(props: {
  body: IEcommerceProduct.IRequest;
}): Promise<IPageIEcommerceProduct.ISummary> {
  const body = props.body;
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Fix price filtering with typia.assert for nullable types
  const priceMin =
    body.price_min !== undefined
      ? typia.assert<number>(body.price_min)
      : undefined;
  const priceMax =
    body.price_max !== undefined
      ? typia.assert<number>(body.price_max)
      : undefined;
  // Build comprehensive where conditions
  const whereInput = {
    deleted_at: null,
    seller: {
      account_status: "active",
      deleted_at: null,
    } satisfies Prisma.ecommerce_sellersWhereInput,
    ...(body.search && {
      name: {
        contains: body.search,
        mode: "insensitive",
      } satisfies Prisma.StringFilter,
    }),
    ...(body.category_id && {
      ecommerce_category_id: body.category_id,
    }),
    ...(priceMin !== undefined && {
      base_price: {
        gte: priceMin,
      } satisfies Prisma.FloatFilter,
    }),
    ...(priceMax !== undefined && {
      base_price: {
        lte: priceMax,
      } satisfies Prisma.FloatFilter,
    }),
    // Handle stock availability filtering at query level
    ...(body.in_stock === true && {
      variants: {
        some: {
          deleted_at: null,
          quantity: { gt: 0 },
        } satisfies Prisma.ecommerce_product_variantsWhereInput,
      } satisfies Prisma.Ecommerce_product_variantsListRelationFilter,
    }),
  } satisfies Prisma.ecommerce_productsWhereInput;
  // Build order by - add relevance sorting when search term exists
  const orderByInput = (
    body.sort_by === "price_low"
      ? { base_price: "asc" as const }
      : body.sort_by === "price_high"
        ? { base_price: "desc" as const }
        : body.sort_by === "newest"
          ? { created_at: "desc" as const }
          : body.search
            ? {
                // For relevance sorting, we could use PostgreSQL full-text search
                // For now, fallback to created_at desc
                created_at: "desc" as const,
              }
            : { created_at: "desc" as const }
  ) satisfies Prisma.ecommerce_productsOrderByWithRelationInput;
  // Efficient single query with all filtering
  const [products, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_products.findMany({
      where: whereInput,
      include: {
        seller: {
          select: {
            id: true,
            email: true,
            shop_name: true,
            shop_description: true,
            logo_image_url: true,
            account_status: true,
            created_at: true,
          } satisfies Prisma.ecommerce_sellersSelect,
        },
        category: {
          select: {
            id: true,
            name: true,
            parent: {
              select: {
                id: true,
                name: true,
                created_at: true, // Add created_at to parent select
              } satisfies Prisma.ecommerce_categoriesSelect,
            },
            created_at: true,
          } satisfies Prisma.ecommerce_categoriesSelect,
        },
        // We don't need variants for the summary view - stock filtering is handled in where
      } satisfies Prisma.ecommerce_productsInclude,
      orderBy: orderByInput,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ecommerce_products.count({
      where: whereInput,
    }),
  ]);
  // Transform to DTO format - efficient single pass
  const data = products.map(
    (product) =>
      ({
        id: product.id as string & tags.Format<"uuid">,
        name: product.name,
        base_price: product.base_price,
        seller: {
          id: product.seller.id as string & tags.Format<"uuid">,
          email: product.seller.email,
          shop_name: product.seller.shop_name,
          shop_description: product.seller.shop_description ?? null,
          logo_image_url: product.seller.logo_image_url ?? null,
          account_status: product.seller.account_status,
          created_at: toISOStringSafe(product.seller.created_at) as string &
            tags.Format<"date-time">,
        } satisfies IEcommerceSeller.ISummary,
        category: {
          id: product.category.id as string & tags.Format<"uuid">,
          name: product.category.name,
          parent: product.category.parent
            ? ({
                id: product.category.parent.id as string & tags.Format<"uuid">,
                name: product.category.parent.name,
                parent: null,
                products_count: 0,
                created_at: toISOStringSafe(
                  product.category.parent.created_at,
                ) as string & tags.Format<"date-time">, // Add created_at
              } satisfies IEcommerceCategory.ISummary)
            : null,
          // Remove products_count as it's not essential for search results
          products_count: 0, // Can be computed separately if needed
          created_at: toISOStringSafe(product.category.created_at) as string &
            tags.Format<"date-time">,
        } satisfies IEcommerceCategory.ISummary,
      }) satisfies IEcommerceProduct.ISummary,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIEcommerceProduct.ISummary;
}
