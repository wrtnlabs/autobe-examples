import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshotsIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshotsIndex";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallReviewSnapshotsIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshotsIndex";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_review_snapshot_indices_deterministic_ordering(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const email = `admin.${RandomGenerator.alphabets(8)}@example.com`;
  const password = `P@ssw0rd-${RandomGenerator.alphabets(8)}`;
  await authorize_admin_join(adminConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2) Find a reviewId with at least 2 snapshot indices by probing candidates.
  // (No review-creation SDK/utilities were provided in the input materials.)
  const candidates = ArrayUtil.repeat(6, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  let pickedReviewId: string | undefined;
  let pickedLimit = 2;
  for (const reviewId of candidates) {
    const result =
      await api.functional.shoppingMall.admin.reviews.snapshot_indices.index(
        adminConnection,
        {
          reviewId,
          body: {
            page: 1,
            limit: 5,
            sortDirection: "asc",
            includeDeleted: undefined,
          } satisfies IShoppingMallReviewSnapshotsIndex.IRequest,
        },
      );
    typia.assert(result);
    if (result.data.length >= 2) {
      pickedReviewId = reviewId;
      pickedLimit = Math.min(5, result.data.length);
      break;
    }
  }
  if (!pickedReviewId) {
    throw new Error(
      "No suitable reviewId with at least 2 snapshot indices found in test environment.",
    );
  }
  // 3) Call asc
  const ascPage =
    await api.functional.shoppingMall.admin.reviews.snapshot_indices.index(
      adminConnection,
      {
        reviewId: pickedReviewId,
        body: {
          page: 1,
          limit: pickedLimit,
          sortDirection: "asc",
          includeDeleted: undefined,
        } satisfies IShoppingMallReviewSnapshotsIndex.IRequest,
      },
    );
  typia.assert(ascPage);
  TestValidator.equals("asc current page", ascPage.pagination.current, 1);
  TestValidator.equals("asc limit", ascPage.pagination.limit, pickedLimit);
  TestValidator.predicate(
    "asc records non-negative",
    ascPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "asc pages non-negative",
    ascPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "asc data length <= limit",
    ascPage.data.length <= ascPage.pagination.limit,
  );
  const ascSequences = ascPage.data.map((x) => x.snapshotSequence);
  TestValidator.predicate(
    "asc snapshotSequence non-decreasing",
    ascSequences.every((v, i, arr) => i === 0 || arr[i - 1] <= v),
  );
  for (const item of ascPage.data) {
    typia.assert(item);
    TestValidator.equals("reviewId matches", item.reviewId, pickedReviewId);
  }
  // 4) Read-only repeat check (state should not change)
  const ascPageRepeat =
    await api.functional.shoppingMall.admin.reviews.snapshot_indices.index(
      adminConnection,
      {
        reviewId: pickedReviewId,
        body: {
          page: 1,
          limit: pickedLimit,
          sortDirection: "asc",
          includeDeleted: undefined,
        } satisfies IShoppingMallReviewSnapshotsIndex.IRequest,
      },
    );
  typia.assert(ascPageRepeat);
  TestValidator.equals(
    "asc repeat snapshotSequence deterministic",
    ascPageRepeat.data.map((x) => x.snapshotSequence),
    ascSequences,
  );
  // 5) Call desc
  const descPage =
    await api.functional.shoppingMall.admin.reviews.snapshot_indices.index(
      adminConnection,
      {
        reviewId: pickedReviewId,
        body: {
          page: 1,
          limit: pickedLimit,
          sortDirection: "desc",
          includeDeleted: undefined,
        } satisfies IShoppingMallReviewSnapshotsIndex.IRequest,
      },
    );
  typia.assert(descPage);
  TestValidator.equals("desc current page", descPage.pagination.current, 1);
  TestValidator.equals("desc limit", descPage.pagination.limit, pickedLimit);
  const descSequences = descPage.data.map((x) => x.snapshotSequence);
  TestValidator.predicate(
    "desc snapshotSequence non-increasing",
    descSequences.every((v, i, arr) => i === 0 || arr[i - 1] >= v),
  );
  for (const item of descPage.data) {
    typia.assert(item);
    TestValidator.equals("reviewId matches", item.reviewId, pickedReviewId);
  }
}
