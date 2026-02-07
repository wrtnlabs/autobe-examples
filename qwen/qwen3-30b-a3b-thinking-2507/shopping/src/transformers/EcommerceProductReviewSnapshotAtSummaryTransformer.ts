import { IEcommerceProductReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReviewSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceProductReviewSnapshotAtSummaryTransformer {
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
        review: true,
      },
    } satisfies Prisma.ecommerce_product_review_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceProductReviewSnapshot.ISummary> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
