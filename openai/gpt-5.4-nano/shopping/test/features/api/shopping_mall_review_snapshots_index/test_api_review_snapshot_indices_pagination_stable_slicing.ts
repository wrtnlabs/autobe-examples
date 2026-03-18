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

export async function test_api_review_snapshot_indices_pagination_stable_slicing(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // NOTE:
  // We must use an existing reviewId that has enough snapshot events.
  // The scenario description assumes such a reviewId is available in test environment.
  // If not, this test will still validate pagination invariants for whatever data exists.
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const limit = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const sortDirection: IShoppingMallReviewSnapshotsIndex.IRequest["sortDirection"] =
    "asc";
  const includeDeleted = false;
  const reqBase = {
    sortDirection,
    includeDeleted,
  } satisfies Omit<
    IShoppingMallReviewSnapshotsIndex.IRequest,
    "page" | "limit"
  >;
  const page1Response =
    await api.functional.shoppingMall.admin.reviews.snapshot_indices.index(
      adminConnection,
      {
        reviewId,
        body: {
          ...reqBase,
          page: 1,
          limit,
        } satisfies IShoppingMallReviewSnapshotsIndex.IRequest,
      },
    );
  typia.assert(page1Response);
  TestValidator.equals(
    "pagination.current should match page 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit should match limit",
    page1Response.pagination.limit,
    limit,
  );
  const records = page1Response.pagination.records;
  const pagesExpected =
    records === 0 ? 0 : Math.ceil(records / (limit as number));
  TestValidator.equals(
    "pagination.pages should be ceiling(records/limit)",
    page1Response.pagination.pages,
    pagesExpected,
  );
  TestValidator.predicate(
    "page1 item count should be <= limit",
    page1Response.data.length <= limit,
  );
  const page1Sequences = page1Response.data.map((x) => x.snapshotSequence);
  const page2Response =
    await api.functional.shoppingMall.admin.reviews.snapshot_indices.index(
      adminConnection,
      {
        reviewId,
        body: {
          ...reqBase,
          page: 2,
          limit,
        } satisfies IShoppingMallReviewSnapshotsIndex.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "pagination.current should match page 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination.limit should match limit on page2",
    page2Response.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "pagination.records should be stable across pages",
    page2Response.pagination.records,
    records,
  );
  TestValidator.predicate(
    "page2 item count should be <= limit",
    page2Response.data.length <= limit,
  );
  const page2Sequences = page2Response.data.map((x) => x.snapshotSequence);
  const overlap = new Set<number>(
    page1Sequences.filter((s) => page2Sequences.includes(s)),
  );
  TestValidator.predicate(
    "no snapshotSequence overlap between page1 and page2",
    overlap.size === 0,
  );
  // Validate deterministic slicing by requesting an additional page=1+page2 items using large limit.
  // If pagination backend is stable, the first (limit*2) items should equal page1 + page2 sequence order.
  const combinedLimit = (limit * 2) as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const combinedResponse =
    await api.functional.shoppingMall.admin.reviews.snapshot_indices.index(
      adminConnection,
      {
        reviewId,
        body: {
          ...reqBase,
          page: 1,
          limit: combinedLimit,
        } satisfies IShoppingMallReviewSnapshotsIndex.IRequest,
      },
    );
  typia.assert(combinedResponse);
  const combinedSequences = combinedResponse.data.map(
    (x) => x.snapshotSequence,
  );
  const expectedCombinedSlice = page1Sequences.concat(page2Sequences);
  TestValidator.equals(
    "combined first slice should equal concatenation of page1 and page2 sequences",
    combinedSequences.slice(0, expectedCombinedSlice.length),
    expectedCombinedSlice,
  );
  // Edge cases
  if (records !== 0 && records <= limit) {
    TestValidator.equals(
      "when records <= limit, page1 should contain all records",
      page1Response.data.length,
      records,
    );
    TestValidator.equals(
      "when records <= limit, pages should be 1",
      page1Response.pagination.pages,
      1,
    );
  }
  if (records === (limit as number) + 1) {
    TestValidator.equals(
      "when records == limit + 1, page2 should contain exactly 1 item",
      page2Response.data.length,
      1,
    );
  }
}
