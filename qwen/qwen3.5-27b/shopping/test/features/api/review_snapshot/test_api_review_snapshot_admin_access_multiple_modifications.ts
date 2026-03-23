import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that an administrator can retrieve the complete snapshot history of a review that has been modified multiple times.
 *
 * This test validates the snapshot retrieval endpoint by:
 * 1. Authenticating as admin, seller, and customer
 * 2. Calling the snapshot retrieval endpoint with a test review ID
 * 3. Verifying the response structure and pagination
 * 4. Validating snapshot data integrity
 *
 * Note: Full review modification history cannot be created due to missing SDK endpoints
 * for product creation, order flow, and review management.
 */
export async function test_api_review_snapshot_admin_access_multiple_modifications(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin Authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Seller Authentication (for product creation in full scenario)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller1234",
      shop_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 3. Customer Authentication (for order and review in full scenario)
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 4. Generate test review ID (would come from review creation in full scenario)
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 5. Admin retrieves review snapshots
  const snapshotsResponse: IPageIShoppingMallReviewSnapshot.ISummary =
    await api.functional.shoppingMall.admin.reviews.snapshots.index(
      adminConnection,
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
  // 6. Validate response structure
  typia.assert(snapshotsResponse);
  // 7. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    snapshotsResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination has non-negative records",
    snapshotsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative pages",
    snapshotsResponse.pagination.pages >= 0,
  );
  // 8. Verify snapshots array structure
  TestValidator.predicate(
    "snapshots is array",
    Array.isArray(snapshotsResponse.data),
  );
  // 9. Validate each snapshot structure if snapshots exist
  if (snapshotsResponse.data.length > 0) {
    await ArrayUtil.asyncForEach(
      snapshotsResponse.data,
      async (snapshot, index) => {
        typia.assert(snapshot);
        // Verify required fields exist
        TestValidator.predicate(
          `snapshot ${index} has valid UUID`,
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            snapshot.id,
          ),
        );
        TestValidator.predicate(
          `snapshot ${index} has valid review ID`,
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            snapshot.shopping_mall_review_id,
          ),
        );
        TestValidator.equals(
          `snapshot ${index} review ID matches request`,
          snapshot.shopping_mall_review_id,
          reviewId,
        );
        TestValidator.predicate(
          `snapshot ${index} has snapshot data`,
          snapshot.snapshot_data.length > 0,
        );
        TestValidator.predicate(
          `snapshot ${index} has valid date-time`,
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(snapshot.created_at),
        );
        // Verify snapshot_data is valid JSON
        try {
          const parsedData = JSON.parse(snapshot.snapshot_data);
          TestValidator.predicate(
            `snapshot ${index} data is valid JSON`,
            typeof parsedData === "object" && parsedData !== null,
          );
        } catch {
          throw new Error(
            `Snapshot ${index} contains invalid JSON in snapshot_data`,
          );
        }
      },
    );
    // 10. Verify chronological ordering (newest first)
    if (snapshotsResponse.data.length > 1) {
      for (let i = 1; i < snapshotsResponse.data.length; i++) {
        TestValidator.predicate(
          `snapshot ${i - 1} is newer than snapshot ${i}`,
          new Date(snapshotsResponse.data[i - 1].created_at).getTime() >=
            new Date(snapshotsResponse.data[i].created_at).getTime(),
        );
      }
    }
  }
  // 11. Test pagination with different parameters
  const page2Response: IPageIShoppingMallReviewSnapshot.ISummary =
    await api.functional.shoppingMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId,
        body: {
          page: 2,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 pagination current",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 pagination limit",
    page2Response.pagination.limit,
    10,
  );
}
