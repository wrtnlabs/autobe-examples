import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceReviewReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewReportSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceAdministratorAtSummaryTransformer } from "./EcommerceAdministratorAtSummaryTransformer";

export namespace EcommerceReviewReportSnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_review_report_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_created_at: true,
        report_reason: true,
        report_category: true,
        customer_id: true,
        review_id: true,
        change_description: true,
        actor: EcommerceAdministratorAtSummaryTransformer.select(),
        reviewReport: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_review_reportsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_review_report_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceReviewReportSnapshot.ISummary> {
    return {
      id: input.id,
      snapshot_created_at: input.snapshot_created_at.toISOString(),
      report_reason: input.report_reason,
      report_category: input.report_category,
      actor: input.actor
        ? await EcommerceAdministratorAtSummaryTransformer.transform(
            input.actor,
          )
        : null,
      customer_id: input.customer_id,
      review_id: input.review_id,
    };
  }
}
