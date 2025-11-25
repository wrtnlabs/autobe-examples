import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReport";
import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function postShoppingMallBuyerReviewsReviewIdReports(props: {
  buyer: BuyerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewReport.ICreate;
}): Promise<IShoppingMallReviewReport> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
    include: {
      buyer: true,
      sale: {
        include: {
          seller: true,
          category: true,
        },
      },
    },
  });

  if (!review) {
    throw new HttpException("Review not found", 404);
  }

  if (review.deleted_at !== null) {
    throw new HttpException("Cannot report a deleted review", 403);
  }

  const reporterBuyer = await MyGlobal.prisma.shopping_mall_buyers.findUnique({
    where: { id: props.buyer.id },
  });

  if (!reporterBuyer) {
    throw new HttpException("Buyer not found", 404);
  }

  const created = await MyGlobal.prisma.shopping_mall_review_reports.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_review_id: props.reviewId,
      reporter_buyer_id: props.buyer.id,
      reporter_seller_id: null,
      report_reason: props.body.report_reason,
      report_details: props.body.report_details ?? null,
      status: "pending",
      created_at: new Date(),
      reviewed_at: null,
    },
  });

  return {
    id: created.id,
    shopping_mall_review_id: created.shopping_mall_review_id,
    reporter_buyer_id: created.reporter_buyer_id ?? undefined,
    reporter_seller_id: created.reporter_seller_id ?? undefined,
    report_reason: created.report_reason,
    report_details: created.report_details ?? undefined,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    reviewed_at: created.reviewed_at
      ? toISOStringSafe(created.reviewed_at)
      : undefined,
    buyer: {
      id: reporterBuyer.id,
      email: reporterBuyer.email,
      full_name: reporterBuyer.full_name,
      phone_number: reporterBuyer.phone_number ?? undefined,
    },
    seller: undefined,
    review: {
      id: review.id,
      shopping_mall_buyer_id: review.shopping_mall_buyer_id,
      shopping_mall_sale_id: review.shopping_mall_sale_id,
      shopping_mall_sale_sku_id: review.shopping_mall_sale_sku_id,
      shopping_mall_order_id: review.shopping_mall_order_id,
      buyer: {
        id: review.buyer.id,
        email: review.buyer.email,
        full_name: review.buyer.full_name,
        phone_number: review.buyer.phone_number ?? undefined,
      },
      sale: {
        id: review.sale.id,
        code: review.sale.code,
        title: review.sale.title,
        status: review.sale.status as
          | "draft"
          | "pending_approval"
          | "published"
          | "suspended"
          | "archived",
        condition: review.sale.condition as "new" | "refurbished" | "used",
        brand: review.sale.brand ?? undefined,
        short_description: review.sale.short_description ?? undefined,
        price: 0,
        thumbnail_url: undefined,
        return_policy_days: review.sale.return_policy_days,
        warranty_info: review.sale.warranty_info ?? undefined,
        created_at: toISOStringSafe(review.sale.created_at),
        updated_at: toISOStringSafe(review.sale.updated_at),
        deleted_at: review.sale.deleted_at
          ? toISOStringSafe(review.sale.deleted_at)
          : undefined,
        seller: {
          id: review.sale.seller.id,
          store_name: review.sale.seller.store_name,
          email: review.sale.seller.email,
          status: review.sale.seller.status as
            | "pending"
            | "approved"
            | "rejected"
            | "suspended",
          email_verified: review.sale.seller.email_verified,
        },
        category: {
          id: review.sale.category.id,
          name: review.sale.category.name,
          slug: review.sale.category.slug,
          description: review.sale.category.description ?? undefined,
          image_url: review.sale.category.image_url ?? undefined,
          parent_id: review.sale.category.parent_id ?? undefined,
          status: review.sale.category.status,
          display_order: review.sale.category.display_order,
          product_count: review.sale.category.product_count,
          created_at: toISOStringSafe(review.sale.category.created_at),
          updated_at: toISOStringSafe(review.sale.category.updated_at),
        },
      },
      star_rating: review.star_rating,
      review_title: review.review_title ?? undefined,
      review_body: review.review_body ?? undefined,
      status: review.status as "pending_moderation" | "approved" | "rejected",
      is_verified_purchase: review.is_verified_purchase,
      is_anonymous: review.is_anonymous,
      helpfulness_vote_count: review.helpfulness_vote_count,
      created_at: toISOStringSafe(review.created_at),
      updated_at: toISOStringSafe(review.updated_at),
      deleted_at: review.deleted_at
        ? toISOStringSafe(review.deleted_at)
        : undefined,
    },
  };
}
