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

export async function test_api_review_snapshot_indices_deleted_event_preserves_history(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Ensure Authorization header is set for subsequent calls
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = member.token.access;
  // 2) Create a customer review owned by this member
  const createdReview =
    await generate_random_shopping_mall_member_reviews_create(
      memberConnection,
      {},
    );
  typia.assert(createdReview);
  const reviewId = createdReview.id;
  // 3) Delete the review to trigger deletion snapshot context
  await api.functional.shoppingMall.member.reviews.erase(memberConnection, {
    reviewId,
  });
  // 4) Call snapshot-indices after deletion
  const firstIndex =
    await api.functional.shoppingMall.member.reviews.snapshot_indices.createSnapshotIndices(
      memberConnection,
      { reviewId },
    );
  typia.assert(firstIndex);
  TestValidator.equals("reviewId matches", firstIndex.reviewId, reviewId);
  TestValidator.equals("deletedAt is null", firstIndex.deletedAt, null);
  TestValidator.predicate(
    "actionType reflects deletion",
    firstIndex.actionType.toLowerCase().includes("deleted"),
  );
  // 5) Call snapshot-indices a second time
  try {
    const secondIndex =
      await api.functional.shoppingMall.member.reviews.snapshot_indices.createSnapshotIndices(
        memberConnection,
        { reviewId },
      );
    typia.assert(secondIndex);
    TestValidator.equals(
      "reviewId matches (second)",
      secondIndex.reviewId,
      reviewId,
    );
    TestValidator.equals(
      "deletedAt stays null (second)",
      secondIndex.deletedAt,
      null,
    );
    TestValidator.equals(
      "snapshotSequence increments deterministically (second)",
      secondIndex.snapshotSequence,
      firstIndex.snapshotSequence + 1,
    );
  } catch (error) {
    await TestValidator.error(
      "second snapshot-indices call should fail or reject without partial persistence",
      async () => {
        throw error;
      },
    );
  }
}
