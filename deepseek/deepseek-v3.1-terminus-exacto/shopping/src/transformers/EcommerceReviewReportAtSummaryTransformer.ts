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

export namespace EcommerceReviewReportAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_review_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        report_category: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        report_reason: true,
        customer: EcommerceCustomerAtSummaryTransformer.select(),
        review: EcommerceReviewAtSummaryTransformer.select(),
        statusTransitions: true,
        snapshots: true,
      },
    } satisfies Prisma.ecommerce_review_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceReviewReport.ISummary> {
    return {
      id: input.id,
      report_category: input.report_category,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      customer: await EcommerceCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      review: await EcommerceReviewAtSummaryTransformer.transform(input.review),
    };
  }
}
