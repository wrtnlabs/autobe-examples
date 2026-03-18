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

export async function test_api_review_snapshot_indices_include_deleted_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  // 2) Find a reachable reviewId (best-effort)
  // We don't have APIs here to create/list reviews, so we probe UUIDs.
  const maxAttempts: number = 10;
  let reviewId: string | undefined = undefined;
  let pageFalse: IPageIShoppingMallReviewSnapshotsIndex.ISummary | undefined =
    undefined;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = typia.random<string & tags.Format<"uuid">>();
    try {
      const response =
        await api.functional.shoppingMall.admin.reviews.snapshot_indices.index(
          adminConnection,
          {
            reviewId: candidate,
            body: {
              page: 1,
              limit: 50,
              sortDirection: "asc",
              includeDeleted: false,
            } satisfies IShoppingMallReviewSnapshotsIndex.IRequest,
          },
        );
      typia.assert(response);
      reviewId = candidate;
      pageFalse = response;
      break;
    } catch (e) {
      // Retry with another uuid. If all attempts fail, rethrow last error.
      if (attempt + 1 >= maxAttempts) throw e;
    }
  }
  if (!reviewId || !pageFalse) {
    throw new Error("Failed to acquire a reachable reviewId for the test.");
  }
  // 4) Validate includeDeleted=false
  const recordsFalse = pageFalse.pagination.records;
  const pagesFalse = pageFalse.pagination.pages;
  TestValidator.equals(
    "includeDeleted=false records match returned data length",
    pageFalse.data.length,
    recordsFalse,
  );
  TestValidator.equals(
    "includeDeleted=false current page",
    pageFalse.pagination.current,
    1,
  );
  if (recordsFalse === 0) {
    TestValidator.equals("includeDeleted=false pages is 0", pagesFalse, 0);
    TestValidator.equals(
      "includeDeleted=false data empty",
      pageFalse.data.length,
      0,
    );
  } else {
    // Every returned item has deletedAt = null
    for (const item of pageFalse.data) {
      TestValidator.equals(
        "deletedAt is null for includeDeleted=false",
        item.deletedAt,
        null,
      );
    }
  }
  const snapshotSequencesFalse = new Set<number>(
    pageFalse.data.map((x) => x.snapshotSequence),
  );
  // 5) Call again with includeDeleted=true
  const pageTrue =
    await api.functional.shoppingMall.admin.reviews.snapshot_indices.index(
      adminConnection,
      {
        reviewId,
        body: {
          page: 1,
          limit: 50,
          sortDirection: "asc",
          includeDeleted: true,
        } satisfies IShoppingMallReviewSnapshotsIndex.IRequest,
      },
    );
  typia.assert(pageTrue);
  // 6) Validate includeDeleted=true superset behavior
  TestValidator.predicate(
    "includeDeleted=true pagination.records >= includeDeleted=false pagination.records",
    pageTrue.pagination.records >= recordsFalse,
  );
  const snapshotSequencesTrue = new Set<number>(
    pageTrue.data.map((x) => x.snapshotSequence),
  );
  for (const seq of snapshotSequencesFalse) {
    TestValidator.predicate(
      "includeDeleted=true snapshotSequence superset",
      snapshotSequencesTrue.has(seq),
    );
  }
  // If includeDeleted=false had data, then includeDeleted=true must not drop any of them.
  // deletedAt can be null or non-null depending on underlying data.
  // If there are no deleted events at all, the responses should match for non-deleted items.
  const hasDeletedTrue = pageTrue.data.some((x) => x.deletedAt !== null);
  const hasDeletedFalse = pageFalse.data.some((x) => x.deletedAt !== null);
  TestValidator.equals(
    "includeDeleted=false contains only non-deleted",
    hasDeletedFalse,
    false,
  );
  if (!hasDeletedTrue) {
    // Expect exact match for deletedAt-null subset (actionType/snapshotSequence)
    TestValidator.equals(
      "includeDeleted=true data length equals includeDeleted=false data length when no deleted events exist",
      pageTrue.data.length,
      pageFalse.data.length,
    );
    TestValidator.equals(
      "includeDeleted=true pagination.records equals includeDeleted=false pagination.records when no deleted events exist",
      pageTrue.pagination.records,
      recordsFalse,
    );
    for (let i = 0; i < pageTrue.data.length; i++) {
      TestValidator.equals(
        "snapshotSequence matches at each index",
        pageTrue.data[i].snapshotSequence,
        pageFalse.data[i].snapshotSequence,
      );
      TestValidator.equals(
        "actionType matches at each index",
        pageTrue.data[i].actionType,
        pageFalse.data[i].actionType,
      );
      TestValidator.equals(
        "deletedAt remains null for includeDeleted=true when no deleted events exist",
        pageTrue.data[i].deletedAt,
        null,
      );
    }
  } else {
    // When deleted events exist, at least one returned item should have deletedAt != null
    TestValidator.predicate(
      "includeDeleted=true includes logically deleted events when they exist",
      hasDeletedTrue,
    );
  }
}
