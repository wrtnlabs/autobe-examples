import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSearch";
import { IEcommerceMallSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSearchResult";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSearchResult";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSearch(props: {
  body: IEcommerceMallSearch.IRequest;
}): Promise<IPageIEcommerceMallSearchResult.ISummary> {
  // Validate price range
  if (
    props.body.min_price !== undefined &&
    props.body.min_price !== null &&
    props.body.max_price !== undefined &&
    props.body.max_price !== null &&
    props.body.min_price > props.body.max_price
  ) {
    throw new HttpException("min_price cannot be greater than max_price", 400);
  }
  // Validate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  if (page < 1) {
    throw new HttpException("page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("limit must be between 1 and 100", 400);
  }
  const query = props.body.query;
  // Build product search filter
  const productWhere: Prisma.ecommerce_mall_productsWhereInput = {
    deleted_at: null,
    status: "active",
    AND: [
      {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
    ],
  };
  // Category filter for products
  if (props.body.category_id !== undefined && props.body.category_id !== null) {
    productWhere.category_id = props.body.category_id;
  }
  // Price filter for products
  if (props.body.min_price !== undefined && props.body.min_price !== null) {
    productWhere.base_price = { gte: props.body.min_price };
  }
  if (props.body.max_price !== undefined && props.body.max_price !== null) {
    if (productWhere.base_price) {
      const basePrice = productWhere.base_price as any;
      productWhere.base_price = {
        gte: basePrice.gte,
        lte: props.body.max_price,
      };
    } else {
      productWhere.base_price = { lte: props.body.max_price };
    }
  }
  // In-stock filter for products
  if (props.body.in_stock === true) {
    productWhere.variants = {
      some: {
        deleted_at: null,
        stock_quantity: { gt: 0 },
      },
    };
  }
  // Seller approval status filter for products
  if (
    props.body.seller_approval_status !== undefined &&
    props.body.seller_approval_status !== null
  ) {
    productWhere.seller = {
      approval_status: props.body.seller_approval_status,
      deleted_at: null,
    };
  }
  // Category search filter
  const categoryWhere: Prisma.ecommerce_mall_categoriesWhereInput = {
    deleted_at: null,
    name: { contains: query, mode: "insensitive" },
  };
  // Seller search filter
  const sellerWhere: Prisma.ecommerce_mall_sellersWhereInput = {
    deleted_at: null,
    shop_name: { contains: query, mode: "insensitive" },
  };
  if (
    props.body.seller_approval_status !== undefined &&
    props.body.seller_approval_status !== null
  ) {
    sellerWhere.approval_status = props.body.seller_approval_status;
  }
  // Build order by
  const orderBy: Prisma.ecommerce_mall_productsOrderByWithRelationInput =
    props.body.sort_by === "price"
      ? props.body.sort_order === "asc"
        ? { base_price: "asc" }
        : { base_price: "desc" }
      : props.body.sort_by === "created_at"
        ? props.body.sort_order === "asc"
          ? { created_at: "asc" }
          : { created_at: "desc" }
        : props.body.sort_by === "name"
          ? props.body.sort_order === "asc"
            ? { name: "asc" }
            : { name: "desc" }
          : { created_at: "desc" };
  // Fetch data
  const [
    products,
    categories,
    sellers,
    productCount,
    categoryCount,
    sellerCount,
  ] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_products.findMany({
      where: productWhere,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        base_price: true,
        created_at: true,
        deleted_at: true,
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            deleted_at: true,
            parent: {
              select: {
                id: true,
                name: true,
                created_at: true,
                deleted_at: true,
                parent: {
                  select: {
                    id: true,
                    name: true,
                    created_at: true,
                    deleted_at: true,
                  },
                },
              },
            },
          },
        },
        seller: {
          select: {
            id: true,
            email: true,
            shop_name: true,
            shop_description: true,
            approval_status: true,
            rejection_reason: true,
            account_status: true,
            created_at: true,
            deleted_at: true,
          },
        },
        images: {
          where: { deleted_at: null },
          orderBy: { sort_order: "asc" },
          take: 1,
          select: { url: true },
        },
        variants: {
          where: { deleted_at: null },
          select: { stock_quantity: true },
        },
        reviews: {
          select: { rating: true },
        },
      },
    }),
    MyGlobal.prisma.ecommerce_mall_categories.findMany({
      where: categoryWhere,
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        deleted_at: true,
        parent: {
          select: {
            id: true,
            name: true,
            created_at: true,
            deleted_at: true,
            parent: {
              select: {
                id: true,
                name: true,
                created_at: true,
                deleted_at: true,
              },
            },
          },
        },
        products: {
          where: { deleted_at: null, status: "active" },
          select: { id: true },
        },
        subcategories: {
          where: { deleted_at: null },
          select: { id: true },
        },
      },
    }),
    MyGlobal.prisma.ecommerce_mall_sellers.findMany({
      where: sellerWhere,
      select: {
        id: true,
        email: true,
        shop_name: true,
        shop_description: true,
        approval_status: true,
        rejection_reason: true,
        account_status: true,
        created_at: true,
        products: {
          where: { deleted_at: null, status: "active" },
          select: { id: true },
        },
      },
    }),
    MyGlobal.prisma.ecommerce_mall_products.count({ where: productWhere }),
    MyGlobal.prisma.ecommerce_mall_categories.count({ where: categoryWhere }),
    MyGlobal.prisma.ecommerce_mall_sellers.count({ where: sellerWhere }),
  ]);
  // Helper to build category summary with parent
  const buildCategorySummary = (
    cat: any,
  ): IEcommerceMallCategory.ISummary | null => {
    if (!cat) return null;
    return {
      id: cat.id,
      name: cat.name,
      parent: buildCategorySummary(cat.parent),
      created_at: toISOStringSafe(cat.created_at),
      deleted_at: cat.deleted_at ? toISOStringSafe(cat.deleted_at) : null,
    } satisfies IEcommerceMallCategory.ISummary;
  };
  // Transform to search results
  const productResults = await ArrayUtil.asyncMap(products, async (product) =>
    typia.assert<
      IEcommerceMallSearchResult.ISummary & {
        type: "product";
      }
    >({
      type: "product",
      name: product.name,
      description: product.description ?? undefined,
      thumbnailUrl: product.images?.[0]?.url ?? "",
      basePrice: Number(product.base_price),
      seller: typia.assert<IEcommerceMallSeller.ISummary>({
        id: product.seller.id,
        email: product.seller.email,
        shop_name: product.seller.shop_name,
        shop_description: product.seller.shop_description ?? null,
        approval_status: typia.assert<"pending" | "approved" | "rejected">(
          product.seller.approval_status,
        ),
        rejection_reason: product.seller.rejection_reason ?? null,
        account_status: typia.assert<"active" | "suspended" | "banned">(
          product.seller.account_status,
        ),
        created_at: toISOStringSafe(product.seller.created_at),
      }),
      category: buildCategorySummary(product.category)!,
      averageRating: product.reviews?.length
        ? typia.assert<number & tags.Minimum<0> & tags.Maximum<5>>(
            product.reviews.reduce(
              (
                sum: number,
                r: {
                  rating: number;
                },
              ) => sum + r.rating,
              0,
            ) / product.reviews.length,
          )
        : null,
      reviewCount: product.reviews?.length ?? 0,
    }),
  );
  const categoryResults = categories.map((category) =>
    typia.assert<
      IEcommerceMallSearchResult.ISummary & {
        type: "category";
      }
    >({
      type: "category",
      name: category.name,
      description: category.description ?? null,
      productCount: category.products?.length ?? 0,
      hasSubcategories: !!category.subcategories?.length,
    }),
  );
  const sellerResults = sellers.map((seller) =>
    typia.assert<
      IEcommerceMallSearchResult.ISummary & {
        type: "seller";
      }
    >({
      type: "seller",
      shopName: seller.shop_name,
      shopDescription: seller.shop_description ?? null,
      approvalStatus: typia.assert<"pending" | "approved" | "rejected">(
        seller.approval_status,
      ),
      productCount: seller.products?.length ?? 0,
    }),
  );
  // Merge and paginate results
  const allResults = [...productResults, ...categoryResults, ...sellerResults];
  const totalRecords = productCount + categoryCount + sellerCount;
  const paginatedResults = allResults.slice(skip, skip + limit);
  return {
    data: paginatedResults,
    pagination: {
      current: page,
      limit,
      records: totalRecords,
      pages: totalRecords > 0 ? Math.ceil(totalRecords / limit) : 0,
    } satisfies IPage.IPagination,
  };
}
