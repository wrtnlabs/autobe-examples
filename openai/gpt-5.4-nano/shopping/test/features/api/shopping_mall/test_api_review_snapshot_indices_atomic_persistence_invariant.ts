import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_reviews_create } from "../../../generate/generate_random_shopping_mall_member_reviews_create";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

export async function test_api_review_snapshot_indices_atomic_persistence_invariant(
  connection: api.IConnection,
): Promise<void> {
  // Admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCreds });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminCreds.email,
      password: adminCreds.password,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // Member actor + create a review
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberCreds });
  await authorize_member_login(memberConnection, {
    body: {
      email: memberCreds.email,
      password: memberCreds.password,
    } satisfies IShoppingMallMember.ILogin,
  });
  const review = await generate_random_shopping_mall_member_reviews_create(
    memberConnection,
    {},
  );
  typia.assert(review);
  const reviewId: string & tags.Format<"uuid"> = review.id;
  // Invariant: creating a snapshot index for an existing review produces a valid linkage
  const snapshotIndex =
    await api.functional.shoppingMall.admin.reviews.snapshot_indices.createSnapshotIndices(
      adminConnection,
      { reviewId },
    );
  typia.assert(snapshotIndex);
  TestValidator.predicate(
    "shoppingMallSnapshotId should be non-empty",
    snapshotIndex.shoppingMallSnapshotId.length > 0,
  );
  TestValidator.equals(
    "reviewId linkage must match",
    snapshotIndex.reviewId,
    reviewId,
  );
  TestValidator.equals(
    "new index entry should not be soft-deleted",
    snapshotIndex.deletedAt,
    null,
  );
}
