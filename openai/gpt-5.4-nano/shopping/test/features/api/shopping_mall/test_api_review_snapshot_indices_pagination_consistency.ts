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

export async function test_api_review_snapshot_indices_pagination_consistency(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  // Authorize admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // The available SDK signature for this endpoint does not expose pagination
  // request fields (current/limit). So we validate determinism and internal
  // pagination consistency between two calls for the same reviewId.
  const first =
    await api.functional.shoppingMall.admin.reviews.snapshot_indices.indexSnapshotIndices(
      adminConnection,
      { reviewId },
    );
  typia.assert(first);
  const second =
    await api.functional.shoppingMall.admin.reviews.snapshot_indices.indexSnapshotIndices(
      adminConnection,
      { reviewId },
    );
  typia.assert(second);
  // Pagination metadata should be internally consistent between calls.
  TestValidator.equals(
    "pagination current matches between calls",
    first.pagination.current,
    second.pagination.current,
  );
  TestValidator.equals(
    "pagination limit matches between calls",
    first.pagination.limit,
    second.pagination.limit,
  );
  TestValidator.equals(
    "pagination records matches between calls",
    first.pagination.records,
    second.pagination.records,
  );
  TestValidator.equals(
    "pagination pages matches between calls",
    first.pagination.pages,
    second.pagination.pages,
  );
  // Data length should not exceed the pagination limit.
  TestValidator.predicate(
    "data length does not exceed limit",
    first.data.length <= first.pagination.limit,
  );
  TestValidator.predicate(
    "data length does not exceed limit (second call)",
    second.data.length <= second.pagination.limit,
  );
  // snapshotSequence ordering must be non-decreasing within each page.
  for (let i = 1; i < first.data.length; i++) {
    TestValidator.predicate(
      `first page snapshotSequence non-decreasing at index ${i}`,
      first.data[i - 1].snapshotSequence <= first.data[i].snapshotSequence,
    );
  }
  for (let i = 1; i < second.data.length; i++) {
    TestValidator.predicate(
      `second page snapshotSequence non-decreasing at index ${i}`,
      second.data[i - 1].snapshotSequence <= second.data[i].snapshotSequence,
    );
  }
  // Responses for the same request should be identical in order and content.
  TestValidator.equals(
    "page data ids match",
    first.data.map((x) => x.id),
    second.data.map((x) => x.id),
  );
  TestValidator.equals(
    "page snapshotSequence list matches",
    first.data.map((x) => x.snapshotSequence),
    second.data.map((x) => x.snapshotSequence),
  );
}
