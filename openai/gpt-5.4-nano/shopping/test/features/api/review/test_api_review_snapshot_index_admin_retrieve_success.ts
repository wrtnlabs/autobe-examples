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

export async function test_api_review_snapshot_index_admin_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Admin auth
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.ILogin;
  await authorize_admin_join(adminConnection, {
    body: adminCreds satisfies IShoppingMallAdmin.IJoin,
  });
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: adminCreds,
  });
  typia.assert(adminAuth);
  // Member auth
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallMember.IJoin;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: memberCreds,
  });
  typia.assert(memberAuth);
  // Create review (initial snapshot)
  const prepared = prepare_random_shopping_mall_review() as unknown as
    | DeepPartial<IShoppingMallReview.ICreate>
    | undefined;
  const createdReview: IShoppingMallReview =
    await generate_random_shopping_mall_member_reviews_create(
      memberConnection,
      {
        body: prepared,
      },
    );
  typia.assert(createdReview);
  // Update review (creates snapshot index)
  const updatedRating = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const updatedReview: IShoppingMallReview =
    await api.functional.shoppingMall.member.reviews.update(memberConnection, {
      reviewId: createdReview.id,
      body: {
        rating: updatedRating,
        body: RandomGenerator.paragraph({ sentences: 2 }),
        is_public: createdReview.is_public,
      } satisfies IShoppingMallReview.IUpdate,
    });
  typia.assert(updatedReview);
  // Retrieve snapshot index as admin
  const snapshotIndexId = typia.random<string & tags.Format<"uuid">>();
  const snapshotIndex: IShoppingMallReviewSnapshotsIndex =
    await api.functional.shoppingMall.admin.reviews.snapshot_indices.at(
      adminConnection,
      {
        reviewId: createdReview.id,
        snapshotIndexId,
      },
    );
  typia.assert(snapshotIndex);
  TestValidator.predicate(
    "snapshot index belongs to review",
    snapshotIndex.reviewId === createdReview.id,
  );
  TestValidator.equals("snapshot index id", snapshotIndex.id, snapshotIndexId);
  TestValidator.predicate(
    "shoppingMallSnapshotId is non-empty",
    snapshotIndex.shoppingMallSnapshotId.length > 0,
  );
  TestValidator.predicate(
    "snapshotSequence is integer",
    Number.isInteger(snapshotIndex.snapshotSequence),
  );
  TestValidator.predicate(
    "createdAt is ISO date-time",
    !Number.isNaN(new Date(snapshotIndex.createdAt).getTime()),
  );
  TestValidator.predicate(
    "updatedAt is ISO date-time",
    !Number.isNaN(new Date(snapshotIndex.updatedAt).getTime()),
  );
  if (snapshotIndex.deletedAt !== null) {
    TestValidator.predicate(
      "deletedAt is ISO date-time when present",
      !Number.isNaN(new Date(snapshotIndex.deletedAt).getTime()),
    );
  }
}
