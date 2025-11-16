import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function deleteShoppingMallBuyerReviewsReviewId(props: {
  buyer: BuyerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReview> {
  const existingReview = await MyGlobal.prisma.shopping_mall_reviews.findUnique(
    {
      where: { id: props.reviewId },
    },
  );

  if (!existingReview) {
    throw new HttpException("Review not found", 404);
  }

  if (existingReview.deleted_at !== null) {
    throw new HttpException("Review not found", 404);
  }

  if (existingReview.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException("Forbidden", 403);
  }

  const deletedReview = await MyGlobal.prisma.shopping_mall_reviews.update({
    where: { id: props.reviewId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
    include: {
      buyer: true,
      sale: {
        include: {
          seller: true,
          category: true,
        },
      },
      sku: {
        include: {
          sale: {
            include: {
              seller: true,
              category: true,
            },
          },
        },
      },
      order: true,
      shopping_mall_review_images: {
        orderBy: { display_order: "asc" },
      },
    },
  });

  return {
    id: deletedReview.id,
    shopping_mall_buyer_id: deletedReview.shopping_mall_buyer_id,
    shopping_mall_sale_id: deletedReview.shopping_mall_sale_id,
    shopping_mall_sale_sku_id: deletedReview.shopping_mall_sale_sku_id,
    shopping_mall_order_id: deletedReview.shopping_mall_order_id,
    buyer: {
      id: deletedReview.buyer.id,
      email: deletedReview.buyer.email,
      full_name: deletedReview.buyer.full_name,
      phone_number:
        deletedReview.buyer.phone_number === null
          ? undefined
          : deletedReview.buyer.phone_number,
    },
    sale: {
      id: deletedReview.sale.id,
      code: deletedReview.sale.code,
      title: deletedReview.sale.title,
      status: typia.assert<
        "draft" | "pending_approval" | "published" | "suspended" | "archived"
      >(deletedReview.sale.status),
      condition: typia.assert<"new" | "refurbished" | "used">(
        deletedReview.sale.condition,
      ),
      brand:
        deletedReview.sale.brand === null
          ? undefined
          : deletedReview.sale.brand,
      short_description:
        deletedReview.sale.short_description === null
          ? undefined
          : deletedReview.sale.short_description,
      price: Number(deletedReview.sku.base_price),
      thumbnail_url: undefined,
      return_policy_days: deletedReview.sale.return_policy_days,
      warranty_info:
        deletedReview.sale.warranty_info === null
          ? undefined
          : deletedReview.sale.warranty_info,
      created_at: toISOStringSafe(deletedReview.sale.created_at),
      updated_at: toISOStringSafe(deletedReview.sale.updated_at),
      deleted_at: deletedReview.sale.deleted_at
        ? toISOStringSafe(deletedReview.sale.deleted_at)
        : undefined,
      seller: {
        id: deletedReview.sale.seller.id,
        store_name: deletedReview.sale.seller.store_name,
        email: deletedReview.sale.seller.email,
        status: typia.assert<"pending" | "approved" | "rejected" | "suspended">(
          deletedReview.sale.seller.status,
        ),
        email_verified: deletedReview.sale.seller.email_verified,
      },
      category: {
        id: deletedReview.sale.category.id,
        name: deletedReview.sale.category.name,
        slug: deletedReview.sale.category.slug,
        description:
          deletedReview.sale.category.description === null
            ? undefined
            : deletedReview.sale.category.description,
        image_url:
          deletedReview.sale.category.image_url === null
            ? undefined
            : deletedReview.sale.category.image_url,
        parent_id:
          deletedReview.sale.category.parent_id === null
            ? undefined
            : deletedReview.sale.category.parent_id,
        status: deletedReview.sale.category.status,
        display_order: deletedReview.sale.category.display_order,
        product_count: deletedReview.sale.category.product_count,
        created_at: toISOStringSafe(deletedReview.sale.category.created_at),
        updated_at: toISOStringSafe(deletedReview.sale.category.updated_at),
      },
    },
    sku: {
      id: deletedReview.sku.id,
      sku_code: deletedReview.sku.sku_code,
      variant_combination: deletedReview.sku.variant_combination,
      base_price: Number(deletedReview.sku.base_price),
      price:
        deletedReview.sku.sale_price !== null
          ? Number(deletedReview.sku.sale_price)
          : Number(deletedReview.sku.base_price),
      enabled: deletedReview.sku.enabled,
      sale: {
        id: deletedReview.sku.sale.id,
        code: deletedReview.sku.sale.code,
        title: deletedReview.sku.sale.title,
        status: typia.assert<
          "draft" | "pending_approval" | "published" | "suspended" | "archived"
        >(deletedReview.sku.sale.status),
        condition: typia.assert<"new" | "refurbished" | "used">(
          deletedReview.sku.sale.condition,
        ),
        brand:
          deletedReview.sku.sale.brand === null
            ? undefined
            : deletedReview.sku.sale.brand,
        short_description:
          deletedReview.sku.sale.short_description === null
            ? undefined
            : deletedReview.sku.sale.short_description,
        price: Number(deletedReview.sku.base_price),
        thumbnail_url: undefined,
        return_policy_days: deletedReview.sku.sale.return_policy_days,
        warranty_info:
          deletedReview.sku.sale.warranty_info === null
            ? undefined
            : deletedReview.sku.sale.warranty_info,
        created_at: toISOStringSafe(deletedReview.sku.sale.created_at),
        updated_at: toISOStringSafe(deletedReview.sku.sale.updated_at),
        deleted_at: deletedReview.sku.sale.deleted_at
          ? toISOStringSafe(deletedReview.sku.sale.deleted_at)
          : undefined,
        seller: {
          id: deletedReview.sku.sale.seller.id,
          store_name: deletedReview.sku.sale.seller.store_name,
          email: deletedReview.sku.sale.seller.email,
          status: typia.assert<
            "pending" | "approved" | "rejected" | "suspended"
          >(deletedReview.sku.sale.seller.status),
          email_verified: deletedReview.sku.sale.seller.email_verified,
        },
        category: {
          id: deletedReview.sku.sale.category.id,
          name: deletedReview.sku.sale.category.name,
          slug: deletedReview.sku.sale.category.slug,
          description:
            deletedReview.sku.sale.category.description === null
              ? undefined
              : deletedReview.sku.sale.category.description,
          image_url:
            deletedReview.sku.sale.category.image_url === null
              ? undefined
              : deletedReview.sku.sale.category.image_url,
          parent_id:
            deletedReview.sku.sale.category.parent_id === null
              ? undefined
              : deletedReview.sku.sale.category.parent_id,
          status: deletedReview.sku.sale.category.status,
          display_order: deletedReview.sku.sale.category.display_order,
          product_count: deletedReview.sku.sale.category.product_count,
          created_at: toISOStringSafe(
            deletedReview.sku.sale.category.created_at,
          ),
          updated_at: toISOStringSafe(
            deletedReview.sku.sale.category.updated_at,
          ),
        },
      },
    },
    order: {
      id: deletedReview.order.id,
      order_number: deletedReview.order.order_number,
      status: deletedReview.order.status,
      subtotal: Number(deletedReview.order.subtotal),
      shipping_total: Number(deletedReview.order.shipping_total),
      tax_total: Number(deletedReview.order.tax_total),
      discount_total: Number(deletedReview.order.discount_total),
      total_amount: Number(deletedReview.order.total_amount),
      estimated_delivery_start: deletedReview.order.estimated_delivery_start
        ? toISOStringSafe(deletedReview.order.estimated_delivery_start)
        : undefined,
      estimated_delivery_end: deletedReview.order.estimated_delivery_end
        ? toISOStringSafe(deletedReview.order.estimated_delivery_end)
        : undefined,
      actual_delivery_at: deletedReview.order.actual_delivery_at
        ? toISOStringSafe(deletedReview.order.actual_delivery_at)
        : undefined,
      cancelled_at: deletedReview.order.cancelled_at
        ? toISOStringSafe(deletedReview.order.cancelled_at)
        : undefined,
      completed_at: deletedReview.order.completed_at
        ? toISOStringSafe(deletedReview.order.completed_at)
        : undefined,
      created_at: toISOStringSafe(deletedReview.order.created_at),
      updated_at: toISOStringSafe(deletedReview.order.updated_at),
    },
    star_rating: deletedReview.star_rating,
    review_title:
      deletedReview.review_title === null
        ? undefined
        : deletedReview.review_title,
    review_body:
      deletedReview.review_body === null
        ? undefined
        : deletedReview.review_body,
    status: typia.assert<"pending_moderation" | "approved" | "rejected">(
      deletedReview.status,
    ),
    is_verified_purchase: deletedReview.is_verified_purchase,
    is_anonymous: deletedReview.is_anonymous,
    helpfulness_vote_count: deletedReview.helpfulness_vote_count,
    images: deletedReview.shopping_mall_review_images.map((image) => ({
      id: image.id,
      shopping_mall_review_id: image.shopping_mall_review_id,
      image_url: image.image_url,
      thumbnail_url: image.thumbnail_url,
      medium_url: image.medium_url,
      display_order: image.display_order,
      created_at: toISOStringSafe(image.created_at),
    })),
    created_at: toISOStringSafe(deletedReview.created_at),
    updated_at: toISOStringSafe(deletedReview.updated_at),
    deleted_at: deletedReview.deleted_at
      ? toISOStringSafe(deletedReview.deleted_at)
      : undefined,
  };
}
