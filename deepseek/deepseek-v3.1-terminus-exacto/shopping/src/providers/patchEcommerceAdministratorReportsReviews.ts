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
import { EcommerceReviewReportAtSummaryTransformer } from "../transformers/EcommerceReviewReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorReportsReviews(props: {
  administrator: AdministratorPayload;
  body: IEcommerceReviewReport;
}): Promise<IPageIEcommerceReviewReport.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.id && { id: props.body.id }),
    ...(props.body.customer &&
      props.body.customer.id && { customer_id: props.body.customer.id }),
    ...(props.body.review &&
      props.body.review.id && { review_id: props.body.review.id }),
    ...(props.body.report_reason && {
      report_reason: { contains: props.body.report_reason },
    }),
    ...(props.body.report_category && {
      report_category: props.body.report_category,
    }),
  } satisfies Prisma.ecommerce_review_reportsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_review_reports.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceReviewReportAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_review_reports.count({ where: whereInput }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceReviewReportAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceReviewReport.ISummary;
}
