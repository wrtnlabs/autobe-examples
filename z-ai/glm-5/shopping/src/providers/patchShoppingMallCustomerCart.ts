import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerCart(props: {
  customer: CustomerPayload;
  body: IShoppingMallCartItem.IRequest;
}): Promise<IPageIShoppingMallCartItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where conditions
  const whereInput: Prisma.shopping_mall_cart_itemsWhereInput = {
    shopping_customer_id: props.customer.id,
    ...(props.body.search && {
      variant: {
        product: {
          name: { contains: props.body.search, mode: "insensitive" },
        },
      },
    }),
    ...(props.body.min_price !== undefined && {
      unit_price: { gte: props.body.min_price },
    }),
    ...(props.body.max_price !== undefined && {
      unit_price: { lte: props.body.max_price },
    }),
  } satisfies Prisma.shopping_mall_cart_itemsWhereInput;
  // Determine orderBy
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.order ?? "desc";
  const orderByInput =
    sortField === "unit_price"
      ? { unit_price: sortOrder }
      : sortField === "quantity"
        ? { quantity: sortOrder }
        : { created_at: sortOrder };
  // Query cart items with all relations
  const cartItems = await MyGlobal.prisma.shopping_mall_cart_items.findMany({
    where: whereInput,
    select: {
      id: true,
      quantity: true,
      unit_price: true,
      created_at: true,
      updated_at: true,
      variant: {
        select: {
          id: true,
          sku_code: true,
          price: true,
          deleted_at: true,
          options: {
            select: { key: true, value: true },
          } satisfies Prisma.shopping_mall_product_variant_optionsFindManyArgs,
          product: {
            select: {
              id: true,
              name: true,
              base_price: true,
              deleted_at: true,
              created_at: true,
              seller: {
                select: {
                  id: true,
                  email: true,
                  shop_name: true,
                  shop_description: true,
                  logo_url: true,
                  approval_status: true,
                  rejection_reason: true,
                  created_at: true,
                  deleted_at: true,
                },
              },
              variants: {
                select: { price: true },
              } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
              images: {
                select: { url: true },
                orderBy: { order: "asc" },
              } satisfies Prisma.shopping_mall_product_imagesFindManyArgs,
              reviews: {
                select: { rating: true },
              } satisfies Prisma.shopping_mall_reviewsFindManyArgs,
            },
          },
          inventoryHistories: {
            select: { quantity_change: true },
          } satisfies Prisma.shopping_mall_product_inventory_historiesFindManyArgs,
        },
      } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
    },
    orderBy:
      orderByInput satisfies Prisma.shopping_mall_cart_itemsOrderByWithRelationInput,
  });
  // Calculate stock and availability for each item
  const itemsWithStock = cartItems.map((item) => {
    const currentStock = item.variant.inventoryHistories.reduce(
      (sum, h) => sum + h.quantity_change,
      0,
    );
    const isDeleted =
      item.variant.deleted_at !== null ||
      item.variant.product.deleted_at !== null;
    const availabilityStatus = (
      isDeleted
        ? "unavailable"
        : currentStock < item.quantity
          ? "insufficient_stock"
          : "available"
    ) as "available" | "unavailable" | "insufficient_stock";
    const stockStatus = (
      currentStock === 0
        ? "out_of_stock"
        : currentStock < item.quantity
          ? "insufficient_stock"
          : "in_stock"
    ) as "in_stock" | "out_of_stock" | "insufficient_stock";
    return {
      ...item,
      currentStock,
      availabilityStatus,
      stockStatus,
    };
  });
  // Apply post-query filters
  let filteredItems = itemsWithStock;
  if (
    props.body.availability_status &&
    props.body.availability_status !== "all"
  ) {
    filteredItems = filteredItems.filter(
      (item) => item.availabilityStatus === props.body.availability_status,
    );
  }
  if (props.body.stock_status && props.body.stock_status !== "all") {
    filteredItems = filteredItems.filter(
      (item) => item.stockStatus === props.body.stock_status,
    );
  }
  // Calculate total after filtering
  const totalRecords = filteredItems.length;
  const totalPages = Math.ceil(totalRecords / limit);
  // Apply pagination
  const paginatedItems = filteredItems.slice(skip, skip + limit);
  // Transform to response
  const data = paginatedItems.map((item) => {
    const variantPrices = item.variant.product.variants.map(
      (v) => v.price ?? item.variant.product.base_price,
    );
    const minPrice =
      variantPrices.length > 0
        ? Math.min(...variantPrices)
        : item.variant.product.base_price;
    const maxPrice =
      variantPrices.length > 0
        ? Math.max(...variantPrices)
        : item.variant.product.base_price;
    const activeReviews = item.variant.product.reviews;
    const averageRating =
      activeReviews.length > 0
        ? activeReviews.reduce((sum, r) => sum + r.rating, 0) /
          activeReviews.length
        : null;
    const mainImageUrl =
      item.variant.product.images.length > 0
        ? item.variant.product.images[0].url
        : undefined;
    const seller = {
      id: item.variant.product.seller.id,
      email: item.variant.product.seller.email,
      shopName: item.variant.product.seller.shop_name,
      shopDescription:
        item.variant.product.seller.shop_description ?? undefined,
      logoUrl: item.variant.product.seller.logo_url ?? undefined,
      approvalStatus: item.variant.product.seller.approval_status,
      rejectionReason:
        item.variant.product.seller.rejection_reason ?? undefined,
      createdAt: toISOStringSafe(item.variant.product.seller.created_at),
      deletedAt: item.variant.product.seller.deleted_at
        ? toISOStringSafe(item.variant.product.seller.deleted_at)
        : null,
    } satisfies IShoppingMallSeller.ISummary;
    return {
      id: item.id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      variant: {
        id: item.variant.id,
        sku_code: item.variant.sku_code,
        price: item.variant.price,
        options: item.variant.options.map((o) => ({
          key: o.key,
          value: o.value,
        })),
        stock_quantity: item.currentStock,
        in_stock: item.currentStock > 0,
      } satisfies IShoppingMallProductVariant.ISummary,
      availability_status: item.availabilityStatus,
      current_stock: item.currentStock,
      product: {
        id: item.variant.product.id,
        name: item.variant.product.name,
        base_price: item.variant.product.base_price,
        min_price: variantPrices.length > 0 ? minPrice : undefined,
        max_price: variantPrices.length > 0 ? maxPrice : undefined,
        main_image_url: mainImageUrl,
        seller: seller,
        average_rating: averageRating,
        review_count: activeReviews.length,
        created_at: toISOStringSafe(item.variant.product.created_at),
      } satisfies IShoppingMallProduct.ISummary,
      seller: seller,
      subtotal: item.unit_price * item.quantity,
    } satisfies IShoppingMallCartItem.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIShoppingMallCartItem.ISummary;
}
