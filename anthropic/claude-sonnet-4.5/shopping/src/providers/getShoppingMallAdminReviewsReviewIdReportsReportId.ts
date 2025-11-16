import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminReviewsReviewIdReportsReportId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewReport> {
  const report = await MyGlobal.prisma.shopping_mall_review_reports.findUnique({
    where: {
      id: props.reportId,
    },
  });

  if (!report) {
    throw new HttpException("Report not found", 404);
  }

  if (report.shopping_mall_review_id !== props.reviewId) {
    throw new HttpException(
      "Report does not belong to the specified review",
      404,
    );
  }

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

  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: sale.shopping_mall_seller_id },
  });

  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }

  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { id: sale.shopping_mall_category_id },
  });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  const reporterBuyer = report.reporter_buyer_id
    ? await MyGlobal.prisma.shopping_mall_buyers.findUnique({
        where: { id: report.reporter_buyer_id },
      })
    : null;

  const reporterSeller = report.reporter_seller_id
    ? await MyGlobal.prisma.shopping_mall_sellers.findUnique({
        where: { id: report.reporter_seller_id },
      })
    : null;

  return {
    id: report.id,
    shopping_mall_review_id: report.shopping_mall_review_id,
    reporter_buyer_id:
      report.reporter_buyer_id === null ? undefined : report.reporter_buyer_id,
    reporter_seller_id:
      report.reporter_seller_id === null
        ? undefined
        : report.reporter_seller_id,
    report_reason: report.report_reason,
    report_details:
      report.report_details === null ? undefined : report.report_details,
    status: report.status,
    created_at: toISOStringSafe(report.created_at),
    reviewed_at: report.reviewed_at
      ? toISOStringSafe(report.reviewed_at)
      : undefined,
    buyer: reporterBuyer
      ? {
          id: reporterBuyer.id,
          email: reporterBuyer.email,
          full_name: reporterBuyer.full_name,
          phone_number:
            reporterBuyer.phone_number === null
              ? undefined
              : reporterBuyer.phone_number,
        }
      : undefined,
    seller: reporterSeller
      ? {
          id: reporterSeller.id,
          store_name: reporterSeller.store_name,
          email: reporterSeller.email,
          status: reporterSeller.status as
            | "pending"
            | "approved"
            | "rejected"
            | "suspended",
          email_verified: reporterSeller.email_verified,
        }
      : undefined,
    review: {
      id: review.id,
      shopping_mall_buyer_id: review.shopping_mall_buyer_id,
      shopping_mall_sale_id: review.shopping_mall_sale_id,
      shopping_mall_sale_sku_id: review.shopping_mall_sale_sku_id,
      shopping_mall_order_id: review.shopping_mall_order_id,
      buyer: {
        id: reviewBuyer.id,
        email: reviewBuyer.email,
        full_name: reviewBuyer.full_name,
        phone_number:
          reviewBuyer.phone_number === null
            ? undefined
            : reviewBuyer.phone_number,
      },
      sale: {
        id: sale.id,
        code: sale.code,
        title: sale.title,
        status: sale.status as
          | "draft"
          | "pending_approval"
          | "published"
          | "suspended"
          | "archived",
        condition: sale.condition as "new" | "refurbished" | "used",
        brand: sale.brand === null ? undefined : sale.brand,
        short_description:
          sale.short_description === null ? undefined : sale.short_description,
        price: 0,
        thumbnail_url: undefined,
        return_policy_days: sale.return_policy_days,
        warranty_info:
          sale.warranty_info === null ? undefined : sale.warranty_info,
        created_at: toISOStringSafe(sale.created_at),
        updated_at: toISOStringSafe(sale.updated_at),
        deleted_at: sale.deleted_at
          ? toISOStringSafe(sale.deleted_at)
          : undefined,
        seller: {
          id: seller.id,
          store_name: seller.store_name,
          email: seller.email,
          status: seller.status as
            | "pending"
            | "approved"
            | "rejected"
            | "suspended",
          email_verified: seller.email_verified,
        },
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description:
            category.description === null ? undefined : category.description,
          image_url:
            category.image_url === null ? undefined : category.image_url,
          parent_id:
            category.parent_id === null ? undefined : category.parent_id,
          status: category.status,
          display_order: category.display_order,
          product_count: category.product_count,
          created_at: toISOStringSafe(category.created_at),
          updated_at: toISOStringSafe(category.updated_at),
        },
      },
      star_rating: review.star_rating,
      review_title:
        review.review_title === null ? undefined : review.review_title,
      review_body: review.review_body === null ? undefined : review.review_body,
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
