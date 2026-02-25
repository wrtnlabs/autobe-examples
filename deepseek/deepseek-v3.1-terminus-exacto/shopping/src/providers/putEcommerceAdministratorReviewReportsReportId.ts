import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEcommerceReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceReviewReportTransformer } from "../transformers/EcommerceReviewReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceAdministratorReviewReportsReportId(props: {
  administrator: AdministratorPayload;
  reportId: string & tags.Format<"uuid">;
  body: IEcommerceReviewReport.IUpdate;
}): Promise<IEcommerceReviewReport> {
  // Verify report exists and is not deleted
  const existingReport =
    await MyGlobal.prisma.ecommerce_review_reports.findFirst({
      where: {
        id: props.reportId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!existingReport) {
    throw new HttpException("Review report not found", 404);
  }
  // Build update data with conditional field updates
  const updateData: Prisma.ecommerce_review_reportsUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };
  // Conditional field updates
  if (props.body.report_reason !== undefined) {
    updateData.report_reason = props.body.report_reason;
  }
  if (props.body.report_category !== undefined) {
    updateData.report_category = props.body.report_category;
  }
  // Perform update and fetch complete result with transformer
  const updated = await MyGlobal.prisma.ecommerce_review_reports.update({
    where: { id: props.reportId },
    data: updateData,
    ...EcommerceReviewReportTransformer.select(),
  });
  return await EcommerceReviewReportTransformer.transform(updated);
}
