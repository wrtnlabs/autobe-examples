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

export async function getShoppingMallBuyerReviewsReviewIdReportsReportId(props: {
  buyer: BuyerPayload;
  reviewId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewReport> {
  const report = await MyGlobal.prisma.shopping_mall_review_reports.findUnique({
    where: { id: props.reportId },
  });

  if (!report) {
    throw new HttpException("Review report not found", 404);
  }

  if (report.shopping_mall_review_id !== props.reviewId) {
    throw new HttpException(
      "Report does not belong to the specified review",
      400,
    );
  }

  if (report.reporter_buyer_id !== props.buyer.id) {
    throw new HttpException("Forbidden", 403);
  }

  const buyer = report.reporter_buyer_id
    ? await MyGlobal.prisma.shopping_mall_buyers.findUnique({
        where: { id: report.reporter_buyer_id },
      })
    : null;

  const seller = report.reporter_seller_id
    ? await MyGlobal.prisma.shopping_mall_sellers.findUnique({
        where: { id: report.reporter_seller_id },
      })
    : null;

  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: report.shopping_mall_review_id },
  });

  if (!review) {
    throw new HttpException("Review not found", 404);
  }

  const reviewBuyer = await MyGlobal.prisma.shopping_mall_buyers.findUnique({
    where: { id: review.shopping_mall_buyer_id },
  });

  if (!reviewBuyer) {
    throw new HttpException("Review buyer not found", 404);
  }

  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: review.shopping_mall_sale_id },
  });

  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }

  const saleSeller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: sale.shopping_mall_seller_id },
  });

  if (!saleSeller) {
    throw new HttpException("Seller not found", 404);
  }

  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { id: sale.shopping_mall_category_id },
  });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  const buyerSummary: IShoppingMallBuyer.ISummary | null | undefined = buyer
    ? {
        id: buyer.id,
        email: buyer.email,
        full_name: buyer.full_name,
        phone_number: buyer.phone_number ?? undefined,
      }
    : null;

  const sellerSummary: IShoppingMallSeller.ISummary | null | undefined = seller
    ? {
        id: seller.id,
        store_name: seller.store_name,
        email: seller.email,
        status: typia.assert<"pending" | "approved" | "rejected" | "suspended">(
          seller.status,
        ),
        email_verified: seller.email_verified,
      }
    : null;

  const reviewSummary: IShoppingMallReview.ISummary = {
    id: review.id,
    shopping_mall_buyer_id: review.shopping_mall_buyer_id,
    shopping_mall_sale_id: review.shopping_mall_sale_id,
    shopping_mall_sale_sku_id: review.shopping_mall_sale_sku_id,
    shopping_mall_order_id: review.shopping_mall_order_id,
    buyer: {
      id: reviewBuyer.id,
      email: reviewBuyer.email,
      full_name: reviewBuyer.full_name,
      phone_number: reviewBuyer.phone_number ?? undefined,
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
      price: 0,
      thumbnail_url: undefined,
      return_policy_days: sale.return_policy_days,
      warranty_info: sale.warranty_info ?? undefined,
      created_at: toISOStringSafe(sale.created_at),
      updated_at: toISOStringSafe(sale.updated_at),
      deleted_at: sale.deleted_at ? toISOStringSafe(sale.deleted_at) : null,
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
    star_rating: review.star_rating,
    review_title: review.review_title ?? undefined,
    review_body: review.review_body ?? undefined,
    status: typia.assert<"pending_moderation" | "approved" | "rejected">(
      review.status,
    ),
    is_verified_purchase: review.is_verified_purchase,
    is_anonymous: review.is_anonymous,
    helpfulness_vote_count: review.helpfulness_vote_count,
    created_at: toISOStringSafe(review.created_at),
    updated_at: toISOStringSafe(review.updated_at),
    deleted_at: review.deleted_at ? toISOStringSafe(review.deleted_at) : null,
  };

  return {
    id: report.id,
    shopping_mall_review_id: report.shopping_mall_review_id,
    reporter_buyer_id: report.reporter_buyer_id ?? undefined,
    reporter_seller_id: report.reporter_seller_id ?? undefined,
    report_reason: report.report_reason,
    report_details: report.report_details ?? undefined,
    status: report.status,
    created_at: toISOStringSafe(report.created_at),
    reviewed_at: report.reviewed_at
      ? toISOStringSafe(report.reviewed_at)
      : null,
    buyer: buyerSummary,
    seller: sellerSummary,
    review: reviewSummary,
  };
}
