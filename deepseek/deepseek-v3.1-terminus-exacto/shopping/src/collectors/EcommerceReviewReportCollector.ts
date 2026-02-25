import { IEcommerceReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceReviewReportCollector {
  export async function collect(props: {
    body: IEcommerceReviewReport.ICreate;
    customer: IEntity;
    review: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      report_reason: props.body.report_reason,
      report_category: props.body.report_category,
      // BelongsTo relations
      customer: { connect: { id: props.customer.id } },
      review: { connect: { id: props.review.id } },
    } satisfies Prisma.ecommerce_review_reportsCreateInput;
  }
}
