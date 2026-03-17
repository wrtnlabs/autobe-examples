import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallReviewAtSummaryTransformer } from "./EcommerceMallReviewAtSummaryTransformer";

export namespace EcommerceMallReviewSnapshotTransformer {
  export type Payload = Prisma.ecommerce_mall_review_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        previous_values: true,
        current_values: true,
        review: EcommerceMallReviewAtSummaryTransformer.select(),
        changedByCustomer: EcommerceMallCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_review_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallReviewSnapshot> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      previous_values: JSON.parse(input.previous_values),
      current_values: JSON.parse(input.current_values),
      review: await EcommerceMallReviewAtSummaryTransformer.transform(
        input.review,
      ),
      changedByCustomer:
        await EcommerceMallCustomerAtSummaryTransformer.transform(
          input.changedByCustomer,
        ),
    };
  }
}
