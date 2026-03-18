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

export async function test_api_review_snapshot_indices_deletion_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const review: IShoppingMallReview =
    await generate_random_shopping_mall_member_reviews_create(
      memberConnection,
      {},
    );
  typia.assert(review);
  const firstIndex =
    await api.functional.shoppingMall.admin.reviews.snapshot_indices.createSnapshotIndices(
      adminConnection,
      {
        reviewId: review.id,
      },
    );
  typia.assert(firstIndex);
  const secondIndex =
    await api.functional.shoppingMall.admin.reviews.snapshot_indices.createSnapshotIndices(
      adminConnection,
      {
        reviewId: review.id,
      },
    );
  typia.assert(secondIndex);
  TestValidator.equals(
    "first index links to reviewId",
    firstIndex.reviewId,
    review.id,
  );
  TestValidator.equals(
    "second index links to reviewId",
    secondIndex.reviewId,
    review.id,
  );
  TestValidator.predicate(
    "second snapshotSequence is greater than first",
    secondIndex.snapshotSequence > firstIndex.snapshotSequence,
  );
  TestValidator.notEquals(
    "snapshot indices are distinct",
    firstIndex.id,
    secondIndex.id,
  );
  const candidateReviewId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentReviewId =
    candidateReviewId === review.id
      ? typia.random<string & tags.Format<"uuid">>()
      : candidateReviewId;
  await TestValidator.error(
    "snapshot indices creation rejects non-existent review",
    async () => {
      await api.functional.shoppingMall.admin.reviews.snapshot_indices.createSnapshotIndices(
        adminConnection,
        {
          reviewId: nonExistentReviewId,
        },
      );
    },
  );
  const thirdIndex =
    await api.functional.shoppingMall.admin.reviews.snapshot_indices.createSnapshotIndices(
      adminConnection,
      {
        reviewId: review.id,
      },
    );
  typia.assert(thirdIndex);
  TestValidator.equals(
    "third index links to reviewId",
    thirdIndex.reviewId,
    review.id,
  );
  TestValidator.predicate(
    "third snapshotSequence is greater than second",
    thirdIndex.snapshotSequence > secondIndex.snapshotSequence,
  );
}
