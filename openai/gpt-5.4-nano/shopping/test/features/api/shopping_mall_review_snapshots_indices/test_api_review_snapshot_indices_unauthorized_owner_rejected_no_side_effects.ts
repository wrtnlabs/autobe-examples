import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshotsIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshotsIndex";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_reviews_create } from "../../../generate/generate_random_shopping_mall_member_reviews_create";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

export async function test_api_review_snapshot_indices_unauthorized_owner_rejected_no_side_effects(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join member A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Join member B
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 3-4) Create a review owned by member A
  const prepared = prepare_random_shopping_mall_review();
  const reviewCreated: IShoppingMallReview =
    await generate_random_shopping_mall_member_reviews_create(
      memberAConnection,
      {
        body: prepared satisfies IShoppingMallReview.ICreate,
      },
    );
  typia.assert(reviewCreated);
  const reviewId = reviewCreated.id;
  // 5) Create the first snapshot index by owner (member A)
  const latestIndex: IShoppingMallReviewSnapshotsIndex =
    await api.functional.shoppingMall.member.reviews.snapshot_indices.createSnapshotIndices(
      memberAConnection,
      { reviewId },
    );
  typia.assert(latestIndex);
  const latestSequence = latestIndex.snapshotSequence;
  // 6-7) Unauthorized attempt by member B (should be rejected)
  await TestValidator.error(
    "unauthorized owner should be rejected without side effects",
    async () => {
      await api.functional.shoppingMall.member.reviews.snapshot_indices.createSnapshotIndices(
        memberBConnection,
        { reviewId },
      );
    },
  );
  // 8-9) Member A can create exactly one more snapshot index
  const nextIndex: IShoppingMallReviewSnapshotsIndex =
    await api.functional.shoppingMall.member.reviews.snapshot_indices.createSnapshotIndices(
      memberAConnection,
      { reviewId },
    );
  typia.assert(nextIndex);
  // 10) Verify invariants
  TestValidator.equals(
    "snapshot sequence increments by exactly 1 after unauthorized rejected attempt",
    nextIndex.snapshotSequence,
    latestSequence + 1,
  );
}
