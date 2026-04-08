import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an authenticated administrator can browse request snapshots with pagination.
 *
 * Validates the complete request snapshot browsing flow for administrators, including authentication, paginated retrieval of cancellation and refund request snapshots, and verification of snapshot data integrity. Ensures that snapshots contain all required fields including status transitions, seller reasons, and related entity summaries.
 *
 * Special attention is given to verifying pagination metadata accuracy, snapshot ordering by creation date (newest first), and proper population of customer, seller, and order item relation data.
 *
 * 1. Administrator authenticates using join endpoint with randomized credentials.
 * 2. Administrator requests page 1 of request snapshots without filters.
 * 3. Validates response structure contains pagination metadata and snapshot data array.
 * 4. Verifies each snapshot includes request_type, status transitions, seller_reason, and timestamps.
 * 5. Confirms snapshots are ordered by created_at descending (newest first).
 * 6. Requests page 2 to verify pagination functionality returns different or empty results.
 */
export async function test_api_request_snapshots_administrator_browsing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Request page 1 of request snapshots without filters
  const page1Response =
    await api.functional.shoppingMall.administrator.request_snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(page1Response);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", page1Response.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    page1Response.pagination.pages >= 0,
  );
  // 4. Verify snapshot data structure
  if (page1Response.data.length > 0) {
    const firstSnapshot = page1Response.data[0];
    // Verify required fields exist
    TestValidator.predicate("snapshot has id", firstSnapshot.id !== undefined);
    TestValidator.predicate(
      "snapshot has request_type",
      firstSnapshot.request_type === "cancellation" ||
        firstSnapshot.request_type === "refund",
    );
    TestValidator.predicate(
      "snapshot has status_before",
      firstSnapshot.status_before !== undefined,
    );
    TestValidator.predicate(
      "snapshot has status_after",
      firstSnapshot.status_after === "approved" ||
        firstSnapshot.status_after === "rejected",
    );
    TestValidator.predicate(
      "snapshot has created_at",
      firstSnapshot.created_at !== undefined,
    );
    // Verify seller_reason can be null or string
    TestValidator.predicate(
      "seller_reason is null or string",
      firstSnapshot.seller_reason === null ||
        typeof firstSnapshot.seller_reason === "string",
    );
    // Verify customer summary
    typia.assert(firstSnapshot.customer);
    TestValidator.predicate(
      "customer has id",
      firstSnapshot.customer.id !== undefined,
    );
    TestValidator.predicate(
      "customer has email",
      firstSnapshot.customer.email !== undefined,
    );
    // Verify seller summary
    typia.assert(firstSnapshot.seller);
    TestValidator.predicate(
      "seller has id",
      firstSnapshot.seller.id !== undefined,
    );
    TestValidator.predicate(
      "seller has email",
      firstSnapshot.seller.email !== undefined,
    );
    // Verify orderItem summary
    typia.assert(firstSnapshot.orderItem);
    TestValidator.predicate(
      "orderItem has id",
      firstSnapshot.orderItem.id !== undefined,
    );
    TestValidator.predicate(
      "orderItem has quantity",
      firstSnapshot.orderItem.quantity !== undefined,
    );
    TestValidator.predicate(
      "orderItem has price",
      firstSnapshot.orderItem.price !== undefined,
    );
    TestValidator.predicate(
      "orderItem has status",
      firstSnapshot.orderItem.status !== undefined,
    );
  }
  // 5. Verify snapshots are ordered by created_at descending (newest first)
  if (page1Response.data.length > 1) {
    for (let i = 1; i < page1Response.data.length; i++) {
      const prevSnapshot = page1Response.data[i - 1];
      const currSnapshot = page1Response.data[i];
      TestValidator.predicate(
        `snapshot ${i - 1} is newer than snapshot ${i}`,
        new Date(prevSnapshot.created_at).getTime() >=
          new Date(currSnapshot.created_at).getTime(),
      );
    }
  }
  // 6. Request page 2 to verify pagination
  const page2Response =
    await api.functional.shoppingMall.administrator.request_snapshots.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 20,
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "current page is 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("limit is 20", page2Response.pagination.limit, 20);
  // If there are more records, page 2 should have different data
  if (page1Response.pagination.pages > 1) {
    TestValidator.predicate("page 2 has data", page2Response.data.length > 0);
    // Verify page 2 data is different from page 1
    if (page1Response.data.length > 0 && page2Response.data.length > 0) {
      TestValidator.notEquals(
        "page 1 and page 2 have different first snapshot",
        page1Response.data[0].id,
        page2Response.data[0].id,
      );
    }
  } else {
    // If only 1 page exists, page 2 should be empty
    TestValidator.equals(
      "page 2 is empty when only 1 page exists",
      page2Response.data.length,
      0,
    );
  }
}
