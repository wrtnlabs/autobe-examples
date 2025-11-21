import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallGlobalSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGlobalSearch";
import { ISearchFilters } from "@ORGANIZATION/PROJECT-api/lib/structures/ISearchFilters";
import { IPriceRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPriceRange";
import { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import { IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPagination";
import { IPageIShoppingMallGlobalSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGlobalSearchResult";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallGlobalSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGlobalSearchResult";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerSearchGlobal(props: {
  customer: CustomerPayload;
  body: IShoppingMallGlobalSearch.IRequest;
}): Promise<IPageIShoppingMallGlobalSearchResult> {
  const { query, entityTypes, filters, pagination } = props.body;
  const { page, limit } = pagination;

  const skip = (page - 1) * limit;
  const currentTime = toISOStringSafe(new Date());

  // Determine which entity types to search
  const searchableTypes = entityTypes ?? [
    "products",
    "categories",
    "customers",
    "sellers",
    "sales",
    "orders",
    "coupons",
    "promotions",
    "articles",
    "reviews",
  ];

  // Build individual search queries for each entity type
  const searchQueries = [];

  if (searchableTypes.includes("products")) {
    const where: Prisma.shopping_mall_productsWhereInput = {
      AND: [
        { deleted_at: null },
        { status: "active" },
        {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        ...(filters?.priceRange
          ? [
              {
                price: {
                  ...(filters.priceRange.min !== undefined && {
                    gte: filters.priceRange.min,
                  }),
                  ...(filters.priceRange.max !== undefined && {
                    lte: filters.priceRange.max,
                  }),
                },
              },
            ]
          : []),
        ...(filters?.categoryId
          ? [{ shopping_mall_category_id: filters.categoryId }]
          : []),
        ...(filters?.sellerId
          ? [{ shopping_mall_seller_id: filters.sellerId }]
          : []),
      ],
    };

    searchQueries.push({
      type: "product" as const,
      query: MyGlobal.prisma.shopping_mall_products.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      count: MyGlobal.prisma.shopping_mall_products.count({ where }),
      mapper: (product: any) => ({
        type: "product",
        id: product.id as string & tags.Format<"uuid">,
        title: product.name,
        description: product.description,
        relevance_score: calculateRelevanceScore(
          query,
          product.name,
          product.description,
        ),
        entity_reference: `product:${product.id}`,
      }),
    });
  }

  if (searchableTypes.includes("categories")) {
    const where: Prisma.shopping_mall_categoriesWhereInput = {
      AND: [
        { deleted_at: null },
        { active: true },
        {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
      ],
    };

    searchQueries.push({
      type: "category" as const,
      query: MyGlobal.prisma.shopping_mall_categories.findMany({
        where,
        skip,
        take: limit,
        orderBy: { display_order: "asc" },
      }),
      count: MyGlobal.prisma.shopping_mall_categories.count({ where }),
      mapper: (category: any) => ({
        type: "category",
        id: category.id as string & tags.Format<"uuid">,
        title: category.name,
        description: category.description ?? undefined,
        relevance_score: calculateRelevanceScore(
          query,
          category.name,
          category.description ?? "",
        ),
        entity_reference: `category:${category.id}`,
      }),
    });
  }

  if (searchableTypes.includes("customers")) {
    const where: Prisma.shopping_mall_customersWhereInput = {
      AND: [
        { deleted_at: null },
        { status: "active" },
        {
          OR: [
            { first_name: { contains: query, mode: "insensitive" } },
            { last_name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
      ],
    };

    searchQueries.push({
      type: "customer" as const,
      query: MyGlobal.prisma.shopping_mall_customers.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      count: MyGlobal.prisma.shopping_mall_customers.count({ where }),
      mapper: (customer: any) => ({
        type: "customer",
        id: customer.id as string & tags.Format<"uuid">,
        title: `${customer.first_name} ${customer.last_name}`,
        description: customer.email,
        relevance_score: calculateRelevanceScore(
          query,
          customer.first_name + " " + customer.last_name,
          customer.email,
        ),
        entity_reference: `customer:${customer.id}`,
      }),
    });
  }

  if (searchableTypes.includes("sellers")) {
    const where: Prisma.shopping_mall_sellersWhereInput = {
      AND: [
        { deleted_at: null },
        { status: "active" },
        {
          OR: [
            { business_name: { contains: query, mode: "insensitive" } },
            { contact_person: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
      ],
    };

    searchQueries.push({
      type: "seller" as const,
      query: MyGlobal.prisma.shopping_mall_sellers.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      count: MyGlobal.prisma.shopping_mall_sellers.count({ where }),
      mapper: (seller: any) => ({
        type: "seller",
        id: seller.id as string & tags.Format<"uuid">,
        title: seller.business_name,
        description: seller.contact_person,
        relevance_score: calculateRelevanceScore(
          query,
          seller.business_name,
          seller.contact_person,
        ),
        entity_reference: `seller:${seller.id}`,
      }),
    });
  }

  if (searchableTypes.includes("sales")) {
    const where: Prisma.shopping_mall_salesWhereInput = {
      AND: [
        { deleted_at: null },
        ...(filters?.saleStatus ? [{ sale_status: filters.saleStatus }] : []),
        ...(filters?.dateRange
          ? [
              {
                sale_date: {
                  ...(filters.dateRange.start && {
                    gte: filters.dateRange.start,
                  }),
                  ...(filters.dateRange.end && { lte: filters.dateRange.end }),
                },
              },
            ]
          : []),
      ],
    };

    searchQueries.push({
      type: "sale" as const,
      query: MyGlobal.prisma.shopping_mall_sales.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sale_date: "desc" },
      }),
      count: MyGlobal.prisma.shopping_mall_sales.count({ where }),
      mapper: (sale: any) => ({
        type: "sale",
        id: sale.id as string & tags.Format<"uuid">,
        title: `Sale #${sale.id.substring(0, 8)}`,
        description: `Amount: ${sale.sale_amount}`,
        relevance_score: 0.5,
        entity_reference: `sale:${sale.id}`,
      }),
    });
  }

  if (searchableTypes.includes("orders")) {
    const where: Prisma.shopping_mall_ordersWhereInput = {
      AND: [
        { deleted_at: null },
        { shopping_mall_customer_id: props.customer.id },
        ...(filters?.orderStatus ? [{ status: filters.orderStatus }] : []),
        ...(filters?.dateRange
          ? [
              {
                created_at: {
                  ...(filters.dateRange.start && {
                    gte: filters.dateRange.start,
                  }),
                  ...(filters.dateRange.end && { lte: filters.dateRange.end }),
                },
              },
            ]
          : []),
      ],
    };

    searchQueries.push({
      type: "order" as const,
      query: MyGlobal.prisma.shopping_mall_orders.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      count: MyGlobal.prisma.shopping_mall_orders.count({ where }),
      mapper: (order: any) => ({
        type: "order",
        id: order.id as string & tags.Format<"uuid">,
        title: `Order ${order.order_number}`,
        description: `Total: ${order.total_amount}`,
        relevance_score: 0.5,
        entity_reference: `order:${order.id}`,
      }),
    });
  }

  if (searchableTypes.includes("coupons")) {
    const where: Prisma.shopping_mall_couponsWhereInput = {
      AND: [
        { deleted_at: null },
        { is_active: true },
        { valid_from: { lte: currentTime } },
        { valid_until: { gte: currentTime } },
        {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { code: { contains: query, mode: "insensitive" } },
          ],
        },
      ],
    };

    searchQueries.push({
      type: "coupon" as const,
      query: MyGlobal.prisma.shopping_mall_coupons.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      count: MyGlobal.prisma.shopping_mall_coupons.count({ where }),
      mapper: (coupon: any) => ({
        type: "coupon",
        id: coupon.id as string & tags.Format<"uuid">,
        title: coupon.name,
        description: coupon.description ?? undefined,
        relevance_score: calculateRelevanceScore(
          query,
          coupon.name,
          coupon.description ?? "",
        ),
        entity_reference: `coupon:${coupon.id}`,
      }),
    });
  }

  if (searchableTypes.includes("promotions")) {
    const where: Prisma.shopping_mall_promotionsWhereInput = {
      AND: [
        { deleted_at: null },
        { is_active: true },
        { start_date: { lte: currentTime } },
        { end_date: { gte: currentTime } },
        ...(filters?.promotionType
          ? [{ promotion_type: filters.promotionType }]
          : []),
        {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
      ],
    };

    searchQueries.push({
      type: "promotion" as const,
      query: MyGlobal.prisma.shopping_mall_promotions.findMany({
        where,
        skip,
        take: limit,
        orderBy: { priority: "desc" },
      }),
      count: MyGlobal.prisma.shopping_mall_promotions.count({ where }),
      mapper: (promotion: any) => ({
        type: "promotion",
        id: promotion.id as string & tags.Format<"uuid">,
        title: promotion.name,
        description: promotion.description ?? undefined,
        relevance_score: calculateRelevanceScore(
          query,
          promotion.name,
          promotion.description ?? "",
        ),
        entity_reference: `promotion:${promotion.id}`,
      }),
    });
  }

  if (searchableTypes.includes("articles")) {
    const where: Prisma.shopping_mall_articlesWhereInput = {
      AND: [
        { deleted_at: null },
        { status: "published" },
        ...(filters?.articleType ? [{ actor_type: filters.articleType }] : []),
        ...(filters?.dateRange
          ? [
              {
                published_at: {
                  ...(filters.dateRange.start && {
                    gte: filters.dateRange.start,
                  }),
                  ...(filters.dateRange.end && { lte: filters.dateRange.end }),
                },
              },
            ]
          : []),
        {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { subtitle: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } },
            { summary: { contains: query, mode: "insensitive" } },
          ],
        },
      ],
    };

    searchQueries.push({
      type: "article" as const,
      query: MyGlobal.prisma.shopping_mall_articles.findMany({
        where,
        skip,
        take: limit,
        orderBy: { published_at: "desc" },
      }),
      count: MyGlobal.prisma.shopping_mall_articles.count({ where }),
      mapper: (article: any) => ({
        type: "article",
        id: article.id as string & tags.Format<"uuid">,
        title: article.title,
        description: article.summary ?? undefined,
        relevance_score: calculateRelevanceScore(
          query,
          article.title,
          article.content,
        ),
        entity_reference: `article:${article.id}`,
      }),
    });
  }

  if (searchableTypes.includes("reviews")) {
    const where: Prisma.shopping_mall_reviewsWhereInput = {
      AND: [
        { deleted_at: null },
        { status: "approved" },
        ...(filters?.reviewRating
          ? [{ overall_rating: { gte: filters.reviewRating } }]
          : []),
        {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } },
          ],
        },
      ],
    };

    searchQueries.push({
      type: "review" as const,
      query: MyGlobal.prisma.shopping_mall_reviews.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      count: MyGlobal.prisma.shopping_mall_reviews.count({ where }),
      mapper: (review: any) => ({
        type: "review",
        id: review.id as string & tags.Format<"uuid">,
        title: review.title,
        description: review.content.substring(0, 100) + "...",
        relevance_score: calculateRelevanceScore(
          query,
          review.title,
          review.content,
        ),
        entity_reference: `review:${review.id}`,
      }),
    });
  }

  // Execute all search queries concurrently
  const results = await Promise.all(searchQueries.map((sq) => sq.query));
  const counts = await Promise.all(searchQueries.map((sq) => sq.count));

  // Map results to unified format
  const allResults: IShoppingMallGlobalSearchResult[] = [];

  searchQueries.forEach((sq, index) => {
    const entityResults = results[index];
    if (entityResults && entityResults.length > 0) {
      allResults.push(...entityResults.map(sq.mapper));
    }
  });

  // Sort by relevance score
  allResults.sort((a, b) => b.relevance_score - a.relevance_score);

  // Apply pagination across all results
  const paginatedResults = allResults.slice(0, limit);
  const total = counts.reduce((sum, count) => sum + count, 0);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: paginatedResults,
  };
}

// Helper function to calculate relevance score based on text matching
function calculateRelevanceScore(
  query: string,
  title: string,
  content: string,
): number {
  const queryLower = query.toLowerCase();
  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();

  let score = 0;

  // Exact match in title
  if (titleLower.includes(queryLower)) {
    score += 2.0;
  }

  // Partial match in title
  if (
    titleLower.includes(
      queryLower.substring(0, Math.floor(queryLower.length / 2)),
    )
  ) {
    score += 1.5;
  }

  // Exact match in content
  if (contentLower.includes(queryLower)) {
    score += 1.0;
  }

  // Partial match in content
  if (
    contentLower.includes(
      queryLower.substring(0, Math.floor(queryLower.length / 2)),
    )
  ) {
    score += 0.5;
  }

  // Bonus for title matches
  if (titleLower.startsWith(queryLower)) {
    score += 0.5;
  }

  return Math.min(score, 5.0); // Cap at 5.0
}
