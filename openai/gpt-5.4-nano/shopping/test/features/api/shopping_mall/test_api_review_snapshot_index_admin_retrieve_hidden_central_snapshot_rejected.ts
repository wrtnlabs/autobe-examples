import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshotsIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshotsIndex";
import type { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
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

export async function test_api_review_snapshot_index_admin_retrieve_hidden_central_snapshot_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin setup (create + login)
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminJoinConnection, { body: adminJoinInput });
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLoginInput = {
    email: adminJoinInput.email,
    password: adminJoinInput.password,
  } satisfies IShoppingMallAdmin.ILogin;
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: adminLoginInput,
  });
  typia.assert(adminAuth);
  // 2) Member setup (create + login)
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallMember.IJoin;
  await authorize_member_join(memberJoinConnection, { body: memberJoinInput });
  const memberConnection: api.IConnection = { host: connection.host };
  const memberLoginInput = {
    email: memberJoinInput.email,
    password: memberJoinInput.password,
  } satisfies IShoppingMallMember.ILogin;
  const memberAuth = await authorize_member_login(memberConnection, {
    body: memberLoginInput,
  });
  typia.assert(memberAuth);
  // 3) Member creates a review
  const review = await generate_random_shopping_mall_member_reviews_create(
    memberConnection,
    {
      body: typia.assert<IShoppingMallReview.ICreate>(
        {
          rating: 5,
          is_public: true,
          body: null,
        } as unknown as IShoppingMallReview.ICreate,
      ),
    },
  );
  typia.assert(review);
  // 4) Trigger second state change: update review (creates additional history)
  const updated = await api.functional.shoppingMall.member.reviews.update(
    memberConnection,
    {
      reviewId: review.id,
      body: {
        rating: 4,
        body: RandomGenerator.paragraph({ sentences: 1 }),
        is_public: false,
      } satisfies IShoppingMallReview.IUpdate,
    },
  );
  typia.assert(updated);
  // 5) Ensure snapshot index rows exist; create a snapshot index entry
  const snapshotIndex =
    await api.functional.shoppingMall.member.reviews.snapshot_indices.createSnapshotIndices(
      memberConnection,
      {
        reviewId: review.id,
      },
    );
  typia.assert(snapshotIndex);
  const { id: snapshotIndexId, shoppingMallSnapshotId: centralSnapshotId } =
    snapshotIndex;
  // 6) Hide the central snapshot by revoking admin party view
  await api.functional.shoppingMall.admin.snapshots.parties.updateSnapshotParties(
    adminConnection,
    {
      snapshotId: centralSnapshotId,
      body: {
        partyType: "admin",
        partyId: adminAuth.id,
        canView: false,
      } satisfies IShoppingMallSnapshotParty.IUpdate,
    },
  );
  // 7) Admin retrieval should be rejected (treated as not found / unauthorized)
  await TestValidator.httpError(
    "admin should not retrieve snapshot index when central snapshot is hidden",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.admin.reviews.snapshot_indices.at(
        adminConnection,
        {
          reviewId: review.id,
          snapshotIndexId,
        },
      );
    },
  );
}
