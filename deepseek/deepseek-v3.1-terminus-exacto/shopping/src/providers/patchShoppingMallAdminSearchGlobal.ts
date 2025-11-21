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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSearchGlobal(props: {
  admin: AdminPayload;
  body: IShoppingMallGlobalSearch.IRequest;
}): Promise<IPageIShoppingMallGlobalSearchResult> {
  const { query, entityTypes, filters, pagination } = props.body;
  const page = pagination.page ?? 1;
  const limit = Math.min(pagination.limit ?? 100, 100); // Cap at 100 for performance
  const skip = (page - 1) * limit;

  // Validate pagination parameters
  if (page < 1 || limit < 1) {
    throw new HttpException("Invalid pagination parameters", 400);
  }

  // Determine which entity types to search
  const searchEntityTypes = entityTypes ?? [
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

  // Build search promises for each entity type
  const searchPromises = searchEntityTypes.map(async (entityType) => {
    try {
      switch (entityType) {
        case "products":
          return await searchProducts(query, filters);
        case "categories":
          return await searchCategories(query, filters);
        case "customers":
          return await searchCustomers(query, filters);
        case "sellers":
          return await searchSellers(query, filters);
        case "sales":
          return await searchSales(query, filters);
        case "orders":
          return await searchOrders(query, filters);
        case "coupons":
          return await searchCoupons(query, filters);
        case "promotions":
          return await searchPromotions(query, filters);
        case "articles":
          return await searchArticles(query, filters);
        case "reviews":
          return await searchReviews(query, filters);
        default:
          return [];
      }
    } catch (error) {
      // Log error but don't fail entire search
      console.error(`Search failed for entity type ${entityType}:`, error);
      return [];
    }
  });

  // Execute all searches concurrently
  const searchResults = await Promise.all(searchPromises);

  // Flatten and sort results by relevance score
  const allResults = searchResults.flat();
  allResults.sort((a, b) => b.relevance_score - a.relevance_score);

  // Apply pagination to sorted results
  const paginatedResults = allResults.slice(skip, skip + limit);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: allResults.length satisfies number as number,
      pages: Math.ceil(allResults.length / limit) satisfies number as number,
    },
    data: paginatedResults,
  };
}

// Individual search functions for each entity type
async function searchProducts(
  query: string,
  filters: ISearchFilters | undefined,
): Promise<IShoppingMallGlobalSearchResult[]> {
  const where: Prisma.shopping_mall_productsWhereInput = {
    deleted_at: null,
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ],
  };

  // Apply filters
  if (filters?.priceRange) {
    where.price = {};
    if (filters.priceRange.min !== undefined)
      where.price.gte = filters.priceRange.min;
    if (filters.priceRange.max !== undefined)
      where.price.lte = filters.priceRange.max;
  }

  if (filters?.categoryId) {
    where.shopping_mall_category_id = filters.categoryId;
  }

  if (filters?.sellerId) {
    where.shopping_mall_seller_id = filters.sellerId;
  }

  const products = await MyGlobal.prisma.shopping_mall_products.findMany({
    where,
    take: 50, // Limit per entity type for performance
  });

  return products.map((product) => ({
    type: "products",
    id: product.id,
    title: product.name,
    description: product.description,
    relevance_score: calculateRelevance(
      product.name,
      product.description,
      query,
    ),
    entity_reference: product.sku,
  }));
}

async function searchCategories(
  query: string,
  filters: ISearchFilters | undefined,
): Promise<IShoppingMallGlobalSearchResult[]> {
  const where: Prisma.shopping_mall_categoriesWhereInput = {
    deleted_at: null,
    active: true,
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ],
  };

  const categories = await MyGlobal.prisma.shopping_mall_categories.findMany({
    where,
    take: 50,
  });

  return categories.map((category) => ({
    type: "categories",
    id: category.id,
    title: category.name,
    description: category.description ?? undefined,
    relevance_score: calculateRelevance(
      category.name,
      category.description ?? "",
      query,
    ),
    entity_reference: undefined,
  }));
}

async function searchCustomers(
  query: string,
  filters: ISearchFilters | undefined,
): Promise<IShoppingMallGlobalSearchResult[]> {
  const where: Prisma.shopping_mall_customersWhereInput = {
    deleted_at: null,
    status: "active",
    OR: [
      { first_name: { contains: query, mode: "insensitive" } },
      { last_name: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
    ],
  };

  const customers = await MyGlobal.prisma.shopping_mall_customers.findMany({
    where,
    take: 50,
  });

  return customers.map((customer) => ({
    type: "customers",
    id: customer.id,
    title: `${customer.first_name} ${customer.last_name}`,
    description: customer.email,
    relevance_score: calculateRelevance(
      `${customer.first_name} ${customer.last_name}`,
      customer.email,
      query,
    ),
    entity_reference: customer.email,
  }));
}

async function searchSellers(
  query: string,
  filters: ISearchFilters | undefined,
): Promise<IShoppingMallGlobalSearchResult[]> {
  const where: Prisma.shopping_mall_sellersWhereInput = {
    deleted_at: null,
    status: "active",
    OR: [
      { business_name: { contains: query, mode: "insensitive" } },
      { contact_person: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
    ],
  };

  const sellers = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where,
    take: 50,
  });

  return sellers.map((seller) => ({
    type: "sellers",
    id: seller.id,
    title: seller.business_name,
    description: seller.contact_person,
    relevance_score: calculateRelevance(
      seller.business_name,
      seller.contact_person,
      query,
    ),
    entity_reference: seller.email,
  }));
}

async function searchSales(
  query: string,
  filters: ISearchFilters | undefined,
): Promise<IShoppingMallGlobalSearchResult[]> {
  const where: Prisma.shopping_mall_salesWhereInput = {
    deleted_at: null,
    sale_status: filters?.saleStatus ?? { not: "cancelled" },
  };

  if (filters?.dateRange) {
    where.sale_date = {};
    if (filters.dateRange.start) where.sale_date.gte = filters.dateRange.start;
    if (filters.dateRange.end) where.sale_date.lte = filters.dateRange.end;
  }

  const sales = await MyGlobal.prisma.shopping_mall_sales.findMany({
    where,
    take: 50,
    include: {
      customer: true,
      seller: true,
    },
  });

  return sales.map((sale) => ({
    type: "sales",
    id: sale.id,
    title: `Sale #${sale.id.substring(0, 8)}`,
    description: `Amount: ${sale.sale_amount} | Customer: ${sale.customer.first_name} ${sale.customer.last_name}`,
    relevance_score: 0.5,
    entity_reference: sale.shopping_mall_order_id,
  }));
}

async function searchOrders(
  query: string,
  filters: ISearchFilters | undefined,
): Promise<IShoppingMallGlobalSearchResult[]> {
  const where: Prisma.shopping_mall_ordersWhereInput = {
    deleted_at: null,
    status: filters?.orderStatus ?? { not: "cancelled" },
    OR: [
      { order_number: { contains: query, mode: "insensitive" } },
      { shipping_address: { contains: query, mode: "insensitive" } },
    ],
  };

  if (filters?.dateRange) {
    where.created_at = {};
    if (filters.dateRange.start) where.created_at.gte = filters.dateRange.start;
    if (filters.dateRange.end) where.created_at.lte = filters.dateRange.end;
  }

  const orders = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where,
    take: 50,
  });

  return orders.map((order) => ({
    type: "orders",
    id: order.id,
    title: `Order ${order.order_number}`,
    description: `Total: ${order.total_amount} | Status: ${order.status}`,
    relevance_score: calculateRelevance(
      order.order_number,
      order.shipping_address,
      query,
    ),
    entity_reference: order.order_number,
  }));
}

async function searchCoupons(
  query: string,
  filters: ISearchFilters | undefined,
): Promise<IShoppingMallGlobalSearchResult[]> {
  const where: Prisma.shopping_mall_couponsWhereInput = {
    deleted_at: null,
    is_active: true,
    OR: [
      { code: { contains: query, mode: "insensitive" } },
      { name: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ],
  };

  if (filters?.dateRange) {
    where.valid_from = {};
    where.valid_until = {};
    if (filters.dateRange.start) where.valid_from.gte = filters.dateRange.start;
    if (filters.dateRange.end) where.valid_until.lte = filters.dateRange.end;
  }

  const coupons = await MyGlobal.prisma.shopping_mall_coupons.findMany({
    where,
    take: 50,
  });

  return coupons.map((coupon) => ({
    type: "coupons",
    id: coupon.id,
    title: coupon.name,
    description: coupon.description ?? undefined,
    relevance_score: calculateRelevance(coupon.code, coupon.name, query),
    entity_reference: coupon.code,
  }));
}

async function searchPromotions(
  query: string,
  filters: ISearchFilters | undefined,
): Promise<IShoppingMallGlobalSearchResult[]> {
  const where: Prisma.shopping_mall_promotionsWhereInput = {
    deleted_at: null,
    is_active: true,
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ],
  };

  if (filters?.promotionType) {
    where.promotion_type = filters.promotionType;
  }

  if (filters?.dateRange) {
    where.start_date = {};
    where.end_date = {};
    if (filters.dateRange.start) where.start_date.gte = filters.dateRange.start;
    if (filters.dateRange.end) where.end_date.lte = filters.dateRange.end;
  }

  const promotions = await MyGlobal.prisma.shopping_mall_promotions.findMany({
    where,
    take: 50,
  });

  return promotions.map((promotion) => ({
    type: "promotions",
    id: promotion.id,
    title: promotion.name,
    description: promotion.description ?? undefined,
    relevance_score: calculateRelevance(
      promotion.name,
      promotion.description ?? "",
      query,
    ),
    entity_reference: promotion.promotion_type,
  }));
}

async function searchArticles(
  query: string,
  filters: ISearchFilters | undefined,
): Promise<IShoppingMallGlobalSearchResult[]> {
  const where: Prisma.shopping_mall_articlesWhereInput = {
    deleted_at: null,
    status: "published",
    OR: [
      { title: { contains: query, mode: "insensitive" } },
      { subtitle: { contains: query, mode: "insensitive" } },
      { content: { contains: query, mode: "insensitive" } },
    ],
  };

  if (filters?.articleType) {
    where.business_status = filters.articleType;
  }

  const articles = await MyGlobal.prisma.shopping_mall_articles.findMany({
    where,
    take: 50,
  });

  return articles.map((article) => ({
    type: "articles",
    id: article.id,
    title: article.title,
    description: article.subtitle ?? article.summary ?? undefined,
    relevance_score: calculateRelevance(article.title, article.content, query),
    entity_reference: article.actor_type,
  }));
}

async function searchReviews(
  query: string,
  filters: ISearchFilters | undefined,
): Promise<IShoppingMallGlobalSearchResult[]> {
  const where: Prisma.shopping_mall_reviewsWhereInput = {
    deleted_at: null,
    status: "approved",
    OR: [
      { title: { contains: query, mode: "insensitive" } },
      { content: { contains: query, mode: "insensitive" } },
    ],
  };

  if (filters?.reviewRating !== undefined) {
    where.overall_rating = { gte: filters.reviewRating };
  }

  const reviews = await MyGlobal.prisma.shopping_mall_reviews.findMany({
    where,
    take: 50,
    include: {
      product: true,
      seller: true,
    },
  });

  return reviews.map((review) => ({
    type: "reviews",
    id: review.id,
    title: review.title,
    description: `Rating: ${review.overall_rating}/5`,
    relevance_score: calculateRelevance(review.title, review.content, query),
    entity_reference:
      review.shopping_mall_product_id ??
      review.shopping_mall_seller_id ??
      undefined,
  }));
}

// Simple relevance scoring based on text match quality
function calculateRelevance(
  title: string,
  content: string,
  query: string,
): number {
  if (!query.trim()) return 0.1;

  const queryLower = query.toLowerCase();
  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();

  const titleMatch = titleLower.includes(queryLower) ? 1 : 0;
  const contentMatch = contentLower.includes(queryLower) ? 0.5 : 0;
  const exactMatch = titleLower === queryLower ? 2 : 0;

  return titleMatch + contentMatch + exactMatch;
}
