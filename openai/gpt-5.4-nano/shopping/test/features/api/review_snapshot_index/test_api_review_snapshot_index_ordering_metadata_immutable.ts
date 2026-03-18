import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshotsIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshotsIndex";
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

export async function test_api_review_snapshot_index_ordering_metadata_immutable(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(joinOutput);
  const review = await generate_random_shopping_mall_member_reviews_create(
    memberConnection,
    {},
  );
  typia.assert(review);
  let nextRating: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>;
  {
    const candidate = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >();
    nextRating =
      candidate === review.rating ? (review.rating % 5) + 1 : candidate;
  }
  const updated = await api.functional.shoppingMall.member.reviews.update(
    memberConnection,
    {
      reviewId: review.id,
      body: {
        rating: nextRating,
        body: RandomGenerator.paragraph({ sentences: 2 }),
        is_public: review.is_public,
      } satisfies IShoppingMallReview.IUpdate,
    },
  );
  typia.assert(updated);
  const history =
    await api.functional.shoppingMall.member.reviews.snapshot_indices.index(
      memberConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 50,
          sortDirection: "asc",
        } satisfies IShoppingMallReviewSnapshotsIndex.IRequest,
      },
    );
  typia.assert(history);
  TestValidator.predicate(
    "should have at least two snapshot index entries",
    () => history.data.length >= 2,
  );
  const distinctSequences: number[] = history.data
    .map((x) => x.snapshotSequence)
    .filter((x, i, arr) => arr.indexOf(x) === i);
  TestValidator.predicate(
    "should have at least two distinct snapshotSequence values",
    () => distinctSequences.length >= 2,
  );
  const entry1 = history.data.find(
    (x) => x.snapshotSequence === distinctSequences[0],
  );
  const entry2 = history.data.find(
    (x) => x.snapshotSequence === distinctSequences[1],
  );
  if (!entry1 || !entry2)
    throw new Error("missing required snapshot history entries");
  const at1 =
    await api.functional.shoppingMall.member.reviews.snapshot_indices.at(
      memberConnection,
      {
        reviewId: review.id,
        snapshotIndexId: entry1.id,
      },
    );
  typia.assert(at1);
  TestValidator.equals(
    "snapshotSequence matches history entry 1",
    at1.snapshotSequence,
    entry1.snapshotSequence,
  );
  TestValidator.equals(
    "actionType matches history entry 1",
    at1.actionType,
    entry1.actionType,
  );
  const at2 =
    await api.functional.shoppingMall.member.reviews.snapshot_indices.at(
      memberConnection,
      {
        reviewId: review.id,
        snapshotIndexId: entry2.id,
      },
    );
  typia.assert(at2);
  TestValidator.equals(
    "snapshotSequence matches history entry 2",
    at2.snapshotSequence,
    entry2.snapshotSequence,
  );
  TestValidator.equals(
    "actionType matches history entry 2",
    at2.actionType,
    entry2.actionType,
  );
  const earlier =
    entry1.snapshotSequence < entry2.snapshotSequence ? entry1 : entry2;
  const later = earlier.id === entry1.id ? entry2 : entry1;
  TestValidator.equals(
    "earlier snapshotSequence is strictly less than later snapshotSequence",
    earlier.snapshotSequence < later.snapshotSequence,
    true,
  );
}
