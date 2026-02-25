import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEcommerceReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";
import { EcommerceReviewAtSummaryTransformer } from "./EcommerceReviewAtSummaryTransformer";

export namespace EcommerceReviewReportTransformer {
  export type Payload = Prisma.ecommerce_review_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        report_reason: true,
        report_category: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: EcommerceCustomerAtSummaryTransformer.select(),
        review: EcommerceReviewAtSummaryTransformer.select(),
        statusTransitions: {
          select: {
            id: true,
            created_at: true,
          },
        } satisfies Prisma.ecommerce_review_report_statusesFindManyArgs,
        snapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_review_report_snapshotsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_review_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceReviewReport> {
    return {
      id: input.id,
      report_reason: input.report_reason,
      report_category: input.report_category,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      customer: await EcommerceCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      review: await EcommerceReviewAtSummaryTransformer.transform(input.review),
    };
  }
}
