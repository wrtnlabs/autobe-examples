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

export async function test_api_review_snapshot_index_admin_retrieve_mismatched_review_context_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1) Sign up admin, then login
  const adminJoinConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2) Sign up members A and B via join, then login
  const memberAJoinConnection: api.IConnection = { host: connection.host };
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = typia.random<string & tags.Format<"password">>();
  await authorize_member_join(memberAJoinConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
    },
  });
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
    } satisfies IShoppingMallMember.ILogin,
  });
  const memberBJoinConnection: api.IConnection = { host: connection.host };
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = typia.random<string & tags.Format<"password">>();
  await authorize_member_join(memberBJoinConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
    },
  });
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberBConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
    } satisfies IShoppingMallMember.ILogin,
  });
  // 3) Create Review A and trigger snapshot-history via update
  const reviewA: IShoppingMallReview =
    await generate_random_shopping_mall_member_reviews_create(
      memberAConnection,
      {
        body: {
          rating: 5,
          is_public: true,
          body: null,
        } satisfies DeepPartial<IShoppingMallReview.ICreate>,
      },
    );
  typia.assert(reviewA);
  await api.functional.shoppingMall.member.reviews.update(memberAConnection, {
    reviewId: reviewA.id,
    body: {
      rating: 4,
      body: null,
      is_public: false,
    } satisfies IShoppingMallReview.IUpdate,
  });
  // 4) Create Review B and trigger snapshot-history via update
  const reviewB: IShoppingMallReview =
    await generate_random_shopping_mall_member_reviews_create(
      memberBConnection,
      {
        body: {
          rating: 5,
          is_public: true,
          body: null,
        } satisfies DeepPartial<IShoppingMallReview.ICreate>,
      },
    );
  typia.assert(reviewB);
  await api.functional.shoppingMall.member.reviews.update(memberBConnection, {
    reviewId: reviewB.id,
    body: {
      rating: 3,
      body: RandomGenerator.paragraph({ sentences: 1 }),
      is_public: true,
    } satisfies IShoppingMallReview.IUpdate,
  });
  // 5) Discover a real snapshotIndexId that belongs to Review A by probing.
  let snapshotIndexIdFromA: (string & tags.Format<"uuid">) | undefined;
  for (let i = 0; i < 25 && snapshotIndexIdFromA === undefined; i++) {
    const candidate = typia.random<string & tags.Format<"uuid">>();
    try {
      const idx: IShoppingMallReviewSnapshotsIndex =
        await api.functional.shoppingMall.admin.reviews.snapshot_indices.at(
          adminConnection,
          {
            reviewId: reviewA.id,
            snapshotIndexId: candidate,
          },
        );
      typia.assert(idx);
      snapshotIndexIdFromA = idx.id;
    } catch (exp) {
      // expected to fail for non-existing candidates
      if (!(exp instanceof api.HttpError)) throw exp;
    }
  }
  if (snapshotIndexIdFromA === undefined) {
    throw new Error(
      "Failed to discover a snapshotIndexId belonging to reviewA within probe limit.",
    );
  }
  // 6) Call endpoint with mismatched pair: reviewId=Review B but snapshotIndexId from Review A
  await TestValidator.httpError(
    "mismatched review context must not be found",
    [404, 403],
    async () =>
      await api.functional.shoppingMall.admin.reviews.snapshot_indices.at(
        adminConnection,
        {
          reviewId: reviewB.id,
          snapshotIndexId: snapshotIndexIdFromA,
        },
      ),
  );
}
