import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin listing product snapshots with multiple filters applied simultaneously.
 *
 * Validates the admin product snapshot listing endpoint with combined filters for
 * pagination (page, limit), seller ID, category name, search keyword, and date range.
 * Verifies that the response contains properly paginated results with correct
 * snapshot data structure including nested seller information.
 *
 * 1. Administrator authenticates using admin join endpoint.
 * 2. Call PATCH /ecommerceMall/admin/admin/product-snapshots with combined filters.
 * 3. Validate response structure with pagination metadata.
 * 4. Verify snapshot fields and nested seller object.
 * 5. Confirm results sorted by createdAt DESC (newest first).
 * 6. Verify all returned snapshots match the combined filter criteria.
 */
export async function test_api_product_snapshot_listing_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Prepare filter parameters with date range
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const requestBody = {
    page: 1 as const,
    limit: 20 as const,
    sellerId: typia.random<string & tags.Format<"uuid">>(),
    categoryName: RandomGenerator.alphabets(8),
    search: RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 4 }),
    createdAfter: ninetyDaysAgo.toISOString(),
    createdBefore: now.toISOString(),
  } satisfies IEcommerceMallProductSnapshot.IRequest;
  // 3. Call the product snapshots listing endpoint with filters
  const response =
    await api.functional.ecommerceMall.admin.admin.product_snapshots.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // 4. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current is defined",
    response.pagination.current !== null &&
      response.pagination.current !== undefined,
  );
  TestValidator.predicate(
    "pagination limit is defined",
    response.pagination.limit !== null &&
      response.pagination.limit !== undefined,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Validate snapshot structure for each item when data exists
  for (const snapshot of response.data) {
    typia.assert(snapshot);
    TestValidator.predicate("snapshot has valid id", snapshot.id.length > 0);
    TestValidator.predicate("snapshot has name", snapshot.name.length > 0);
    TestValidator.predicate(
      "snapshot has description",
      snapshot.description.length > 0,
    );
    TestValidator.predicate("snapshot has basePrice", snapshot.basePrice >= 0);
    TestValidator.predicate(
      "snapshot has categoryName",
      snapshot.categoryName.length > 0,
    );
    TestValidator.predicate(
      "snapshot has createdAt",
      snapshot.createdAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot has productId",
      snapshot.productId.length > 0,
    );
    // Validate nested seller object
    typia.assert(snapshot.seller);
    TestValidator.predicate("seller has id", snapshot.seller.id.length > 0);
    TestValidator.predicate(
      "seller has email",
      snapshot.seller.email.length > 0,
    );
    TestValidator.predicate(
      "seller has approvalStatus",
      snapshot.seller.approvalStatus.length > 0,
    );
    TestValidator.predicate(
      "seller has suspensionStatus",
      snapshot.seller.suspensionStatus.length > 0,
    );
    // 6. Verify snapshots match filter criteria (only when results exist)
    // Verify sellerId filter matches
    if (requestBody.sellerId != null) {
      TestValidator.equals(
        "snapshot seller id matches filter",
        snapshot.seller.id,
        requestBody.sellerId,
      );
    }
    // Verify categoryName filter matches
    if (requestBody.categoryName != null) {
      TestValidator.equals(
        "snapshot category matches filter",
        snapshot.categoryName,
        requestBody.categoryName,
      );
    }
    // Verify date range filter matches
    if (requestBody.createdAfter != null) {
      const createdAt = new Date(snapshot.createdAt).getTime();
      const afterTime = new Date(requestBody.createdAfter).getTime();
      TestValidator.predicate(
        "snapshot createdAt >= createdAfter",
        createdAt >= afterTime,
      );
    }
    if (requestBody.createdBefore != null) {
      const createdAt = new Date(snapshot.createdAt).getTime();
      const beforeTime = new Date(requestBody.createdBefore).getTime();
      TestValidator.predicate(
        "snapshot createdAt <= createdBefore",
        createdAt <= beforeTime,
      );
    }
    // Verify search filter (case-insensitive partial match on name)
    if (requestBody.search && requestBody.search.length > 0) {
      const searchLower = requestBody.search.toLowerCase();
      const nameLower = snapshot.name.toLowerCase();
      TestValidator.predicate(
        "snapshot name contains search keyword",
        nameLower.includes(searchLower),
      );
    }
  }
  // 7. Validate results are sorted by createdAt DESC (newest first)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].createdAt).getTime();
      const next = new Date(response.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `snapshot[${i}] createdAt >= snapshot[${i + 1}] createdAt`,
        current >= next,
      );
    }
  }
}
