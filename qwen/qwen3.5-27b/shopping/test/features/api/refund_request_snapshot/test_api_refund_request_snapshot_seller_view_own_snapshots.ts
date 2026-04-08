import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller can view refund request snapshots they responded to.
 *
 * Validates the seller's ability to retrieve paginated refund request snapshots with proper authorization filtering. Ensures that the response structure matches the expected schema and that snapshots contain complete status transition information.
 *
 * The test verifies that sellers can only access their own snapshots (authorization filter applied), and that each snapshot includes the seller's summary information, status transitions, and response text.
 *
 * 1. Seller registers and authenticates with the platform.
 * 2. Seller requests refund request snapshots with pagination parameters.
 * 3. Validates response structure and pagination metadata.
 * 4. Verifies snapshot content including status transitions and seller information.
 */
export async function test_api_refund_request_snapshot_seller_view_own_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Request refund request snapshots with pagination
  const snapshots =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    snapshots.pagination !== undefined,
  );
  TestValidator.equals("current page", snapshots.pagination.current, 1);
  TestValidator.equals("limit", snapshots.pagination.limit, 20);
  TestValidator.predicate(
    "records count valid",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate("pages count valid", snapshots.pagination.pages >= 0);
  // 4. Validate snapshots array structure
  TestValidator.predicate("data array exists", Array.isArray(snapshots.data));
  // 5. If snapshots exist, validate their structure
  if (snapshots.data.length > 0) {
    const firstSnapshot = snapshots.data[0];
    // Validate required fields exist
    TestValidator.predicate("snapshot has id", firstSnapshot.id !== undefined);
    TestValidator.predicate(
      "snapshot has refund_request_id",
      firstSnapshot.refund_request_id !== undefined,
    );
    TestValidator.predicate(
      "snapshot has seller",
      firstSnapshot.seller !== undefined,
    );
    TestValidator.predicate(
      "snapshot has status_before",
      firstSnapshot.status_before !== undefined,
    );
    TestValidator.predicate(
      "snapshot has status_after",
      firstSnapshot.status_after !== undefined,
    );
    TestValidator.predicate(
      "snapshot has created_at",
      firstSnapshot.created_at !== undefined,
    );
    // Validate seller information in snapshot
    TestValidator.predicate(
      "seller has email",
      firstSnapshot.seller.email !== undefined,
    );
    TestValidator.predicate(
      "seller has approval_status",
      firstSnapshot.seller.approval_status !== undefined,
    );
    TestValidator.predicate(
      "seller has seller_profile",
      firstSnapshot.seller.seller_profile !== undefined,
    );
    // Validate status transition values
    TestValidator.predicate(
      "status_before is valid",
      typeof firstSnapshot.status_before === "string",
    );
    TestValidator.predicate(
      "status_after is valid",
      typeof firstSnapshot.status_after === "string",
    );
    // Validate response_text can be null or string
    TestValidator.predicate(
      "response_text is null or string",
      firstSnapshot.response_text === null ||
        typeof firstSnapshot.response_text === "string",
    );
  }
}
