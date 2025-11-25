import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";
import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function putShoppingMallBuyerReviewsReviewId(props: {
  buyer: BuyerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.IUpdate;
}): Promise<IShoppingMallReview> {
  const existing = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
  });

  if (!existing) {
    throw new HttpException("Review not found", 404);
  }

  if (existing.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException("Forbidden", 403);
  }

  if (existing.deleted_at !== null) {
    throw new HttpException("Review not found", 404);
  }

  if (props.body.images !== undefined) {
    await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.shopping_mall_review_images.deleteMany({
        where: { shopping_mall_review_id: props.reviewId },
      });

      if (props.body.images && props.body.images.length > 0) {
        await tx.shopping_mall_review_images.createMany({
          data: props.body.images.map((img) => ({
            id: v4() as string & tags.Format<"uuid">,
            shopping_mall_review_id: props.reviewId,
            image_url: img.image_url,
            thumbnail_url: img.thumbnail_url,
            medium_url: img.medium_url,
            display_order: img.display_order,
            created_at: new Date(),
          })),
        });
      }
    });
  }

  await MyGlobal.prisma.shopping_mall_reviews.update({
    where: { id: props.reviewId },
    data: {
      ...(props.body.star_rating !== undefined && {
        star_rating: props.body.star_rating,
      }),
      ...(props.body.review_title !== undefined && {
        review_title: props.body.review_title,
      }),
      ...(props.body.review_body !== undefined && {
        review_body: props.body.review_body,
      }),
      updated_at: new Date(),
    },
  });

  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
  });

  if (!review) {
    throw new HttpException("Review not found after update", 500);
  }

  const [buyer, sale, sku, order, images] = await Promise.all([
    MyGlobal.prisma.shopping_mall_buyers.findUnique({
      where: { id: review.shopping_mall_buyer_id },
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
      where: { shopping_mall_review_id: props.reviewId },
      orderBy: { display_order: "asc" },
    }),
  ]);

  if (!buyer || !sale || !sku || !order) {
    throw new HttpException("Related data not found", 500);
  }

  const [seller, category, saleSkus] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sellers.findUnique({
      where: { id: sale.shopping_mall_seller_id },
    }),
    MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: sale.shopping_mall_category_id },
    }),
    MyGlobal.prisma.shopping_mall_sale_skus.findMany({
      where: { shopping_mall_sale_id: sale.id },
    }),
  ]);

  if (!seller || !category) {
    throw new HttpException("Seller or category not found", 500);
  }

  const skuSale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: sku.shopping_mall_sale_id },
  });

  if (!skuSale) {
    throw new HttpException("SKU sale not found", 500);
  }

  const [skuSeller, skuCategory] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sellers.findUnique({
      where: { id: skuSale.shopping_mall_seller_id },
    }),
    MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: skuSale.shopping_mall_category_id },
    }),
  ]);

  if (!skuSeller || !skuCategory) {
    throw new HttpException("SKU seller or category not found", 500);
  }

  const minPrice =
    saleSkus.length > 0
      ? Math.min(...saleSkus.map((s) => s.base_price))
      : sku.base_price;

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
      price: minPrice,
      thumbnail_url: undefined,
      return_policy_days: sale.return_policy_days,
      warranty_info: sale.warranty_info ?? undefined,
      created_at: toISOStringSafe(sale.created_at),
      updated_at: toISOStringSafe(sale.updated_at),
      deleted_at: sale.deleted_at
        ? toISOStringSafe(sale.deleted_at)
        : undefined,
      seller: {
        id: seller.id,
        store_name: seller.store_name,
        email: seller.email,
        status: typia.assert<"pending" | "approved" | "rejected" | "suspended">(
          seller.status,
        ),
        email_verified: seller.email_verified,
      },
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description ?? undefined,
        image_url: category.image_url ?? undefined,
        parent_id: category.parent_id ?? undefined,
        status: category.status,
        display_order: category.display_order,
        product_count: category.product_count,
        created_at: toISOStringSafe(category.created_at),
        updated_at: toISOStringSafe(category.updated_at),
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
        price: minPrice,
        thumbnail_url: undefined,
        return_policy_days: skuSale.return_policy_days,
        warranty_info: skuSale.warranty_info ?? undefined,
        created_at: toISOStringSafe(skuSale.created_at),
        updated_at: toISOStringSafe(skuSale.updated_at),
        deleted_at: skuSale.deleted_at
          ? toISOStringSafe(skuSale.deleted_at)
          : undefined,
        seller: {
          id: skuSeller.id,
          store_name: skuSeller.store_name,
          email: skuSeller.email,
          status: typia.assert<
            "pending" | "approved" | "rejected" | "suspended"
          >(skuSeller.status),
          email_verified: skuSeller.email_verified,
        },
        category: {
          id: skuCategory.id,
          name: skuCategory.name,
          slug: skuCategory.slug,
          description: skuCategory.description ?? undefined,
          image_url: skuCategory.image_url ?? undefined,
          parent_id: skuCategory.parent_id ?? undefined,
          status: skuCategory.status,
          display_order: skuCategory.display_order,
          product_count: skuCategory.product_count,
          created_at: toISOStringSafe(skuCategory.created_at),
          updated_at: toISOStringSafe(skuCategory.updated_at),
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
    images: images.map((img) => ({
      id: img.id,
      shopping_mall_review_id: img.shopping_mall_review_id,
      image_url: img.image_url,
      thumbnail_url: img.thumbnail_url,
      medium_url: img.medium_url,
      display_order: img.display_order,
      created_at: toISOStringSafe(img.created_at),
    })),
    created_at: toISOStringSafe(review.created_at),
    updated_at: toISOStringSafe(review.updated_at),
    deleted_at: review.deleted_at
      ? toISOStringSafe(review.deleted_at)
      : undefined,
  };
}
