import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEcommerceReviewEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewEdit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceReviewAtSummaryTransformer } from "./EcommerceReviewAtSummaryTransformer";

export namespace EcommerceReviewEditAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_review_editsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        edited_at: true,
        rating_before: true,
        rating_after: true,
        content_before: true,
        content_after: true,
        created_at: true,
        review: EcommerceReviewAtSummaryTransformer.select(),
        editingCustomer: true,
      },
    } satisfies Prisma.ecommerce_review_editsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceReviewEdit.ISummary> {
    return {
      id: input.id,
      edited_at: input.edited_at.toISOString(),
      rating_before: input.rating_before,
      rating_after: input.rating_after,
      review: await EcommerceReviewAtSummaryTransformer.transform(input.review),
    };
  }
}
