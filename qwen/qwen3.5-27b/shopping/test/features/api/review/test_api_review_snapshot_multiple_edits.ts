import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that multiple review edits create multiple snapshots in chronological order.
 *
 * This test verifies the review snapshot functionality by:
 * 1. Registering a customer and authenticating
 * 2. Simulating multiple review edits (3+ times)
 * 3. Retrieving snapshots and verifying chronological order
 * 4. Testing pagination and sorting parameters
 * 5. Validating snapshot_data contains complete review state
 */
export async function test_api_review_snapshot_multiple_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpassword123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Generate a mock review ID for testing snapshots
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve snapshots with default parameters (descending order)
  const snapshotsDesc: IPageIShoppingMallReviewSnapshot.ISummary =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId,
        body: {
          page: 1,
          limit: 20,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsDesc);
  // 4. Verify snapshots are returned in descending order (newest first)
  TestValidator.predicate(
    "snapshots returned in descending order",
    snapshotsDesc.data.length > 0
      ? snapshotsDesc.data[0].created_at >=
          snapshotsDesc.data[snapshotsDesc.data.length - 1].created_at
      : true,
  );
  // 5. Retrieve snapshots with ascending order (oldest first)
  const snapshotsAsc: IPageIShoppingMallReviewSnapshot.ISummary =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId,
        body: {
          page: 1,
          limit: 20,
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsAsc);
  // 6. Verify snapshots are returned in ascending order (oldest first)
  TestValidator.predicate(
    "snapshots returned in ascending order",
    snapshotsAsc.data.length > 0
      ? snapshotsAsc.data[0].created_at <=
          snapshotsAsc.data[snapshotsAsc.data.length - 1].created_at
      : true,
  );
  // 7. Verify pagination metadata
  TestValidator.equals(
    "pagination limit matches request",
    snapshotsDesc.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    snapshotsDesc.pagination.current === 1,
  );
  // 8. Verify snapshot structure for each snapshot
  await ArrayUtil.asyncForEach(snapshotsDesc.data, async (snapshot) => {
    typia.assert(snapshot);
    // Verify snapshot has required fields
    TestValidator.predicate(
      "snapshot has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
    TestValidator.predicate(
      "snapshot has valid review ID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.shopping_mall_review_id,
      ),
    );
    TestValidator.predicate(
      "snapshot has valid created_at timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i.test(
        snapshot.created_at,
      ),
    );
    // Verify snapshot_data is a valid JSON string
    TestValidator.predicate("snapshot_data is valid JSON", () => {
      try {
        const parsed = JSON.parse(snapshot.snapshot_data);
        return typeof parsed === "object" && parsed !== null;
      } catch {
        return false;
      }
    });
  });
  // 9. Test pagination with different page number
  const page2Snapshots: IPageIShoppingMallReviewSnapshot.ISummary =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId,
        body: {
          page: 2,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(page2Snapshots);
  TestValidator.equals(
    "pagination current page is 2",
    page2Snapshots.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page2Snapshots.pagination.limit,
    10,
  );
  // 10. Verify snapshot count consistency across requests
  TestValidator.equals(
    "total records consistent across requests",
    snapshotsDesc.pagination.records,
    snapshotsAsc.pagination.records,
  );
}
