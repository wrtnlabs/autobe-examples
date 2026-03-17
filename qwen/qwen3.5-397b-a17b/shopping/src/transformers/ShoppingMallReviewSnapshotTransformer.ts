import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCustomerAtSummaryTransformer } from "./ShoppingMallCustomerAtSummaryTransformer";
import { ShoppingMallReviewAtSummaryTransformer } from "./ShoppingMallReviewAtSummaryTransformer";

export namespace ShoppingMallReviewSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_review_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        rating: true,
        content: true,
        snapshot_at: true,
        created_at: true,
        review: ShoppingMallReviewAtSummaryTransformer.select(),
        snapshotByUser: ShoppingMallCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_review_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallReviewSnapshot> {
    return {
      id: input.id,
      rating: input.rating,
      content: input.content ?? null,
      snapshot_at: input.snapshot_at.toISOString(),
      created_at: input.created_at.toISOString(),
      review: await ShoppingMallReviewAtSummaryTransformer.transform(
        input.review,
      ),
      snapshotByUser: await ShoppingMallCustomerAtSummaryTransformer.transform(
        input.snapshotByUser,
      ),
    };
  }
}
