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

export async function test_api_review_snapshot_index_access_control_not_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = RandomGenerator.alphaNumeric(16);
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAAuth);

  // 2) Create a review owned by Member A (generator utility exists)
  const memberAReview: IShoppingMallReview =
    await generate_random_shopping_mall_member_reviews_create(
      memberAConnection,
      {},
    );
  typia.assert(memberAReview);

  const reviewIdA = memberAReview.id;

  // 3) Create at least one snapshot index entry for that review
  const snapshotIndexA: IShoppingMallReviewSnapshotsIndex =
    await api.functional.shoppingMall.member.reviews.snapshot_indices.createSnapshotIndices(
      memberAConnection,
      {
        reviewId: reviewIdA,
      },
    );
  typia.assert(snapshotIndexA);

  const snapshotIndexIdA = snapshotIndexA.id;

  // 4) Register Member B (non-owner)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = RandomGenerator.alphaNumeric(16);
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberBAuth);

  // 5) Attempt to access Member A's snapshot index using Member B
  await TestValidator.error(
    "should deny snapshot index access for non-owner",
    async () => {
      await api.functional.shoppingMall.member.reviews.snapshot_indices.at(
        memberBConnection,
        {
          reviewId: reviewIdA,
          snapshotIndexId: snapshotIndexIdA,
        },
      );
    },
  );

  // 6) Verify integrity: Member A can still access their snapshot index
  const snapshotIndexAAfter: IShoppingMallReviewSnapshotsIndex =
    await api.functional.shoppingMall.member.reviews.snapshot_indices.at(
      memberAConnection,
      {
        reviewId: reviewIdA,
        snapshotIndexId: snapshotIndexIdA,
      },
    );
  typia.assert(snapshotIndexAAfter);

  TestValidator.equals(
    "snapshot index id unchanged",
    snapshotIndexAAfter.id,
    snapshotIndexA.id,
  );
  TestValidator.equals(
    "snapshot event review id unchanged",
    snapshotIndexAAfter.reviewId,
    snapshotIndexA.reviewId,
  );
  TestValidator.equals(
    "snapshot sequence unchanged",
    snapshotIndexAAfter.snapshotSequence,
    snapshotIndexA.snapshotSequence,
  );
}
