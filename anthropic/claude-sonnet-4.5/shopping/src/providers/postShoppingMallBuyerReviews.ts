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

export async function postShoppingMallBuyerReviews(props: {
  buyer: BuyerPayload;
  body: IShoppingMallReview.ICreate;
}): Promise<IShoppingMallReview> {
  const buyerId = props.buyer.id;

  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.body.shopping_mall_order_id,
      shopping_mall_buyer_id: buyerId,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException("Order not found or does not belong to you", 404);
  }

  if (order.status !== "delivered" && order.status !== "completed") {
    throw new HttpException(
      "Reviews can only be submitted for delivered or completed orders",
      403,
    );
  }

  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      shopping_mall_order_id: props.body.shopping_mall_order_id,
      shopping_mall_sale_sku_id: props.body.shopping_mall_sale_sku_id,
      deleted_at: null,
    },
  });

  if (!orderItem) {
    throw new HttpException(
      "The specified product SKU was not found in this order",
      404,
    );
  }

  const existingReview = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      shopping_mall_buyer_id: buyerId,
      shopping_mall_order_id: props.body.shopping_mall_order_id,
      shopping_mall_sale_sku_id: props.body.shopping_mall_sale_sku_id,
      deleted_at: null,
    },
  });

  if (existingReview) {
    throw new HttpException(
      "You have already submitted a review for this product purchase",
      400,
    );
  }

  const reviewId = v4() as string & tags.Format<"uuid">;

  const createdReview = await MyGlobal.prisma.shopping_mall_reviews.create({
    data: {
      id: reviewId,
      shopping_mall_buyer_id: buyerId,
      shopping_mall_sale_id: props.body.shopping_mall_sale_id,
      shopping_mall_sale_sku_id: props.body.shopping_mall_sale_sku_id,
      shopping_mall_order_id: props.body.shopping_mall_order_id,
      star_rating: props.body.star_rating,
      review_title: props.body.review_title ?? null,
      review_body: props.body.review_body ?? null,
      status: "pending_moderation",
      is_verified_purchase: true,
      is_anonymous: props.body.is_anonymous,
      helpfulness_vote_count: 0,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  const imagePromises =
    props.body.images?.map((imageData) => {
      const imageId = v4() as string & tags.Format<"uuid">;
      return MyGlobal.prisma.shopping_mall_review_images.create({
        data: {
          id: imageId,
          shopping_mall_review_id: reviewId,
          image_url: imageData.image_url,
          thumbnail_url: imageData.thumbnail_url,
          medium_url: imageData.medium_url,
          display_order: imageData.display_order,
          created_at: toISOStringSafe(new Date()),
        },
      });
    }) ?? [];

  const createdImages = await Promise.all(imagePromises);

  const [buyer, sale, sku] = await Promise.all([
    MyGlobal.prisma.shopping_mall_buyers.findUnique({
      where: { id: buyerId },
    }),
    MyGlobal.prisma.shopping_mall_sales.findUnique({
      where: { id: props.body.shopping_mall_sale_id },
    }),
    MyGlobal.prisma.shopping_mall_sale_skus.findUnique({
      where: { id: props.body.shopping_mall_sale_sku_id },
    }),
  ]);

  if (!buyer || !sale || !sku) {
    throw new HttpException("Related entities not found", 404);
  }

  const [seller, category] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sellers.findUnique({
      where: { id: sale.shopping_mall_seller_id },
    }),
    MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: sale.shopping_mall_category_id },
    }),
  ]);

  if (!seller || !category) {
    throw new HttpException("Seller or category not found", 404);
  }

  return {
    id: createdReview.id,
    shopping_mall_buyer_id: createdReview.shopping_mall_buyer_id,
    shopping_mall_sale_id: createdReview.shopping_mall_sale_id,
    shopping_mall_sale_sku_id: createdReview.shopping_mall_sale_sku_id,
    shopping_mall_order_id: createdReview.shopping_mall_order_id,
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
          id: seller.id,
          store_name: seller.store_name,
          email: seller.email,
          status: typia.assert<
            "pending" | "approved" | "rejected" | "suspended"
          >(seller.status),
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
    star_rating: createdReview.star_rating,
    review_title: createdReview.review_title ?? undefined,
    review_body: createdReview.review_body ?? undefined,
    status: typia.assert<"pending_moderation" | "approved" | "rejected">(
      createdReview.status,
    ),
    is_verified_purchase: createdReview.is_verified_purchase,
    is_anonymous: createdReview.is_anonymous,
    helpfulness_vote_count: createdReview.helpfulness_vote_count,
    images: createdImages.map((img) => ({
      id: img.id,
      shopping_mall_review_id: img.shopping_mall_review_id,
      image_url: img.image_url,
      thumbnail_url: img.thumbnail_url,
      medium_url: img.medium_url,
      display_order: img.display_order,
      created_at: toISOStringSafe(img.created_at),
    })),
    created_at: toISOStringSafe(createdReview.created_at),
    updated_at: toISOStringSafe(createdReview.updated_at),
    deleted_at: createdReview.deleted_at
      ? toISOStringSafe(createdReview.deleted_at)
      : undefined,
  };
}
