import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";

export async function getShoppingMallReviewsReviewId(props: {
  reviewId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReview> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
  });

  if (!review) {
    throw new HttpException("Review not found", 404);
  }

  const [buyer, seller, category, sale, sku, order, images] = await Promise.all(
    [
      MyGlobal.prisma.shopping_mall_buyers.findUnique({
        where: { id: review.shopping_mall_buyer_id },
      }),
      MyGlobal.prisma.shopping_mall_sellers.findFirst({
        where: { id: review.shopping_mall_sale_id },
      }),
      MyGlobal.prisma.shopping_mall_categories.findFirst({
        where: { id: review.shopping_mall_sale_id },
      }),
      MyGlobal.prisma.shopping_mall_sales.findUnique({
        where: { id: review.shopping_mall_sale_id },
      }),
      MyGlobal.prisma.shopping_mall_sale_skus.findUnique({
        where: { id: review.shopping_mall_sale_sku_id },
      }),
      MyGlobal.prisma.shopping_mall_orders.findUnique({
        where: { id: review.shopping_mall_order_id },
      }),
      MyGlobal.prisma.shopping_mall_review_images.findMany({
        where: { shopping_mall_review_id: review.id },
        orderBy: { display_order: "asc" },
      }),
    ],
  );

  if (!buyer || !seller || !category || !sale || !sku || !order) {
    throw new HttpException("Related data not found", 404);
  }

  const saleSeller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: sale.shopping_mall_seller_id },
  });

  const saleCategory =
    await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: sale.shopping_mall_category_id },
    });

  const skuSale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: sku.shopping_mall_sale_id },
  });

  if (!saleSeller || !saleCategory || !skuSale) {
    throw new HttpException("Related data not found", 404);
  }

  const skuSaleSeller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: skuSale.shopping_mall_seller_id },
  });

  const skuSaleCategory =
    await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: skuSale.shopping_mall_category_id },
    });

  if (!skuSaleSeller || !skuSaleCategory) {
    throw new HttpException("Related data not found", 404);
  }

  return {
    id: review.id,
    shopping_mall_buyer_id: review.shopping_mall_buyer_id,
    shopping_mall_sale_id: review.shopping_mall_sale_id,
    shopping_mall_sale_sku_id: review.shopping_mall_sale_sku_id,
    shopping_mall_order_id: review.shopping_mall_order_id,
    buyer: {
      id: buyer.id,
      email: buyer.email,
      full_name: buyer.full_name,
      phone_number: buyer.phone_number ?? undefined,
    },
    sale: {
      id: sale.id,
      code: sale.code,
      title: sale.title,
      status: typia.assert<
        "draft" | "pending_approval" | "published" | "suspended" | "archived"
      >(sale.status),
      condition: typia.assert<"new" | "refurbished" | "used">(sale.condition),
      brand: sale.brand ?? undefined,
      short_description: sale.short_description ?? undefined,
      price: sku.base_price,
      thumbnail_url: undefined,
      return_policy_days: sale.return_policy_days,
      warranty_info: sale.warranty_info ?? undefined,
      created_at: toISOStringSafe(sale.created_at),
      updated_at: toISOStringSafe(sale.updated_at),
      deleted_at: sale.deleted_at
        ? toISOStringSafe(sale.deleted_at)
        : undefined,
      seller: {
        id: saleSeller.id,
        store_name: saleSeller.store_name,
        email: saleSeller.email,
        status: typia.assert<"pending" | "approved" | "rejected" | "suspended">(
          saleSeller.status,
        ),
        email_verified: saleSeller.email_verified,
      },
      category: {
        id: saleCategory.id,
        name: saleCategory.name,
        slug: saleCategory.slug,
        description: saleCategory.description ?? undefined,
        image_url: saleCategory.image_url ?? undefined,
        parent_id: saleCategory.parent_id ?? undefined,
        status: saleCategory.status,
        display_order: saleCategory.display_order,
        product_count: saleCategory.product_count,
        created_at: toISOStringSafe(saleCategory.created_at),
        updated_at: toISOStringSafe(saleCategory.updated_at),
      },
    },
    sku: {
      id: sku.id,
      sku_code: sku.sku_code,
      variant_combination: sku.variant_combination,
      base_price: sku.base_price,
      price: sku.sale_price ?? sku.base_price,
      enabled: sku.enabled,
      sale: {
        id: skuSale.id,
        code: skuSale.code,
        title: skuSale.title,
        status: typia.assert<
          "draft" | "pending_approval" | "published" | "suspended" | "archived"
        >(skuSale.status),
        condition: typia.assert<"new" | "refurbished" | "used">(
          skuSale.condition,
        ),
        brand: skuSale.brand ?? undefined,
        short_description: skuSale.short_description ?? undefined,
        price: sku.base_price,
        thumbnail_url: undefined,
        return_policy_days: skuSale.return_policy_days,
        warranty_info: skuSale.warranty_info ?? undefined,
        created_at: toISOStringSafe(skuSale.created_at),
        updated_at: toISOStringSafe(skuSale.updated_at),
        deleted_at: skuSale.deleted_at
          ? toISOStringSafe(skuSale.deleted_at)
          : undefined,
        seller: {
          id: skuSaleSeller.id,
          store_name: skuSaleSeller.store_name,
          email: skuSaleSeller.email,
          status: typia.assert<
            "pending" | "approved" | "rejected" | "suspended"
          >(skuSaleSeller.status),
          email_verified: skuSaleSeller.email_verified,
        },
        category: {
          id: skuSaleCategory.id,
          name: skuSaleCategory.name,
          slug: skuSaleCategory.slug,
          description: skuSaleCategory.description ?? undefined,
          image_url: skuSaleCategory.image_url ?? undefined,
          parent_id: skuSaleCategory.parent_id ?? undefined,
          status: skuSaleCategory.status,
          display_order: skuSaleCategory.display_order,
          product_count: skuSaleCategory.product_count,
          created_at: toISOStringSafe(skuSaleCategory.created_at),
          updated_at: toISOStringSafe(skuSaleCategory.updated_at),
        },
      },
    },
    order: {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      subtotal: order.subtotal,
      shipping_total: order.shipping_total,
      tax_total: order.tax_total,
      discount_total: order.discount_total,
      total_amount: order.total_amount,
      estimated_delivery_start: order.estimated_delivery_start
        ? toISOStringSafe(order.estimated_delivery_start)
        : undefined,
      estimated_delivery_end: order.estimated_delivery_end
        ? toISOStringSafe(order.estimated_delivery_end)
        : undefined,
      actual_delivery_at: order.actual_delivery_at
        ? toISOStringSafe(order.actual_delivery_at)
        : undefined,
      cancelled_at: order.cancelled_at
        ? toISOStringSafe(order.cancelled_at)
        : undefined,
      completed_at: order.completed_at
        ? toISOStringSafe(order.completed_at)
        : undefined,
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
    },
    star_rating: review.star_rating,
    review_title: review.review_title ?? undefined,
    review_body: review.review_body ?? undefined,
    status: typia.assert<"pending_moderation" | "approved" | "rejected">(
      review.status,
    ),
    is_verified_purchase: review.is_verified_purchase,
    is_anonymous: review.is_anonymous,
    helpfulness_vote_count: review.helpfulness_vote_count,
    images: images.map((image) => ({
      id: image.id,
      shopping_mall_review_id: image.shopping_mall_review_id,
      image_url: image.image_url,
      thumbnail_url: image.thumbnail_url,
      medium_url: image.medium_url,
      display_order: image.display_order,
      created_at: toISOStringSafe(image.created_at),
    })),
    created_at: toISOStringSafe(review.created_at),
    updated_at: toISOStringSafe(review.updated_at),
    deleted_at: review.deleted_at
      ? toISOStringSafe(review.deleted_at)
      : undefined,
  };
}
