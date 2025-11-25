import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReport";
import { IPageIShoppingMallReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminReviewsReviewIdReports(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewReport.IRequest;
}): Promise<IPageIShoppingMallReviewReport.ISummary> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
  });

  if (!review) {
    throw new HttpException("Review not found", 404);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_review_reports.findMany({
      where: {
        shopping_mall_review_id: props.reviewId,
        ...(props.body.reason && { report_reason: props.body.reason }),
        ...(props.body.status && { status: props.body.status }),
        ...(props.body.reporter_id && {
          OR: [
            { reporter_buyer_id: props.body.reporter_id },
            { reporter_seller_id: props.body.reporter_id },
          ],
        }),
        ...((props.body.created_after || props.body.created_before) && {
          created_at: {
            ...(props.body.created_after && {
              gte: new Date(props.body.created_after),
            }),
            ...(props.body.created_before && {
              lte: new Date(props.body.created_before),
            }),
          },
        }),
        ...(props.body.reviewed_at !== undefined &&
          (props.body.reviewed_at === null
            ? { reviewed_at: null }
            : { reviewed_at: new Date(props.body.reviewed_at) })),
      },
      skip,
      take: limit,
      orderBy: props.body.sort_by
        ? props.body.sort_by === "created_at"
          ? { created_at: props.body.sort_order ?? "desc" }
          : props.body.sort_by === "status"
            ? { status: props.body.sort_order ?? "asc" }
            : { report_reason: props.body.sort_order ?? "asc" }
        : { created_at: "desc" },
      include: {
        reporterBuyer: true,
        reporterSeller: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_review_reports.count({
      where: {
        shopping_mall_review_id: props.reviewId,
        ...(props.body.reason && { report_reason: props.body.reason }),
        ...(props.body.status && { status: props.body.status }),
        ...(props.body.reporter_id && {
          OR: [
            { reporter_buyer_id: props.body.reporter_id },
            { reporter_seller_id: props.body.reporter_id },
          ],
        }),
        ...((props.body.created_after || props.body.created_before) && {
          created_at: {
            ...(props.body.created_after && {
              gte: new Date(props.body.created_after),
            }),
            ...(props.body.created_before && {
              lte: new Date(props.body.created_before),
            }),
          },
        }),
        ...(props.body.reviewed_at !== undefined &&
          (props.body.reviewed_at === null
            ? { reviewed_at: null }
            : { reviewed_at: new Date(props.body.reviewed_at) })),
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((report) => ({
      id: report.id as string & tags.Format<"uuid">,
      review_id: report.shopping_mall_review_id as string & tags.Format<"uuid">,
      reason: report.report_reason,
      status: report.status as
        | "pending"
        | "reviewed_valid"
        | "reviewed_invalid"
        | "dismissed",
      report_details:
        report.report_details === null
          ? undefined
          : (report.report_details as string & tags.MaxLength<1000>),
      created_at: toISOStringSafe(report.created_at),
      reviewed_at: report.reviewed_at
        ? toISOStringSafe(report.reviewed_at)
        : undefined,
      reporter: report.reporter_buyer_id
        ? {
            reporter_type: "buyer" as const,
            reporter_buyer: {
              id: report.reporterBuyer!.id as string & tags.Format<"uuid">,
              email: report.reporterBuyer!.email as string &
                tags.Format<"email">,
              full_name: report.reporterBuyer!.full_name,
              phone_number:
                report.reporterBuyer!.phone_number === null
                  ? undefined
                  : report.reporterBuyer!.phone_number,
            },
          }
        : report.reporter_seller_id
          ? {
              reporter_type: "seller" as const,
              reporter_seller: {
                id: report.reporterSeller!.id as string & tags.Format<"uuid">,
                store_name: report.reporterSeller!.store_name,
                email: report.reporterSeller!.email as string &
                  tags.Format<"email">,
                status: report.reporterSeller!.status as
                  | "pending"
                  | "approved"
                  | "rejected"
                  | "suspended",
                email_verified: report.reporterSeller!.email_verified,
              },
            }
          : null,
    })),
  };
}
