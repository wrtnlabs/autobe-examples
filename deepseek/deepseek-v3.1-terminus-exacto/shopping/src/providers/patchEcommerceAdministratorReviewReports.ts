import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEcommerceReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorReviewReports(props: {
  administrator: AdministratorPayload;
  body: IEcommerceReviewReport.IRequest;
}): Promise<IPageIEcommerceReviewReport.ISummary> {
  // Validate request parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const skip = (page - 1) * limit;
  // Build WHERE conditions without Date constructor
  const whereInput: Prisma.ecommerce_review_reportsWhereInput = {
    deleted_at: null,
  };
  // Add customer_id filter if provided
  if (props.body.customer_id) {
    whereInput.customer_id = props.body.customer_id;
  }
  // Add review_id filter if provided
  if (props.body.review_id) {
    whereInput.review_id = props.body.review_id;
  }
  // Add report_category filter if provided
  if (props.body.report_category) {
    whereInput.report_category = { contains: props.body.report_category };
  }
  // Add date range filter if provided
  if (props.body.created_at_from && props.body.created_at_to) {
    whereInput.created_at = {
      gte: props.body.created_at_from,
      lte: props.body.created_at_to,
    };
  } else if (props.body.created_at_from) {
    whereInput.created_at = { gte: props.body.created_at_from };
  } else if (props.body.created_at_to) {
    whereInput.created_at = { lte: props.body.created_at_to };
  }
  // Add report_reason text search if provided
  if (props.body.report_reason) {
    whereInput.report_reason = { contains: props.body.report_reason };
  }
  try {
    // Execute findMany with pagination
    const data = await MyGlobal.prisma.ecommerce_review_reports.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
          },
        },
        review: {
          select: {
            id: true,
            rating: true,
            content: true,
            created_at: true,
            customer: {
              select: {
                id: true,
                email: true,
                display_name: true,
                created_at: true,
              },
            },
          },
        },
      },
    });
    // Get total count
    const total = await MyGlobal.prisma.ecommerce_review_reports.count({
      where: whereInput,
    });
    // Transform results without type assertions
    const transformedData: IEcommerceReviewReport.ISummary[] = data.map(
      (report) => ({
        id: report.id,
        report_category: report.report_category,
        created_at: toISOStringSafe(report.created_at),
        updated_at: toISOStringSafe(report.updated_at),
        customer: {
          id: report.customer.id,
          email: report.customer.email,
          display_name: report.customer.display_name,
          created_at: toISOStringSafe(report.customer.created_at),
        } satisfies IEcommerceCustomer.ISummary,
        review: {
          id: report.review.id,
          rating: report.review.rating,
          content: report.review.content,
          created_at: toISOStringSafe(report.review.created_at),
          customer: {
            id: report.review.customer.id,
            email: report.review.customer.email,
            display_name: report.review.customer.display_name,
            created_at: toISOStringSafe(report.review.customer.created_at),
          } satisfies IEcommerceCustomer.ISummary,
        } satisfies IEcommerceReview.ISummary,
      }),
    );
    return {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
      data: transformedData,
    };
  } catch (error) {
    throw new HttpException("Failed to fetch review reports", 500);
  }
}
