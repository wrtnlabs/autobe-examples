import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReview";
import { IEcommerceProductReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReviewSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceProductReviewAtSummaryTransformer } from "./EcommerceProductReviewAtSummaryTransformer";

export namespace EcommerceProductReviewSnapshotTransformer {
  export type Payload = Prisma.ecommerce_product_review_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        before: true,
        after: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        review: EcommerceProductReviewAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_product_review_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceProductReviewSnapshot> {
    return {
      id: input.id,
      before: input.before,
      after: input.after,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      review: await EcommerceProductReviewAtSummaryTransformer.transform(
        input.review,
      ),
    };
  }
}
