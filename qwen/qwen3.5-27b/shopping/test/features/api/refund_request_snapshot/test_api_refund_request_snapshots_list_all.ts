import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
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
 * Test the primary success path for viewing refund request snapshots as an administrator.
 *
 * Validates the complete refund request snapshots listing flow including administrator authentication and snapshot retrieval. Ensures that the response contains properly structured pagination metadata and snapshot data with seller information, status transitions, and timestamps.
 *
 * Special attention is given to verifying that the response structure matches the expected DTO, pagination metadata is accurate, and snapshots are sorted by created_at descending. Handles edge cases such as empty snapshot lists and null response_text fields.
 *
 * 1. Administrator registers and authenticates to the platform.
 * 2. Administrator calls the refund request snapshots endpoint with no filters.
 * 3. Validates response structure and pagination metadata.
 * 4. Verifies each snapshot contains required fields with correct types.
 * 5. Confirms snapshots are sorted by created_at descending if data exists.
 */
export async function test_api_refund_request_snapshots_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // 2. Retrieve all refund request snapshots with no filters
  const snapshots =
    await api.functional.shoppingMall.administrator.refund_requests.snapshots.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination records match data length",
    snapshots.pagination.records,
    snapshots.data.length,
  );
  TestValidator.predicate(
    "current page is at least 1",
    snapshots.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", snapshots.pagination.limit > 0);
  TestValidator.predicate(
    "pages calculated correctly",
    snapshots.pagination.pages ===
      Math.ceil(snapshots.pagination.records / snapshots.pagination.limit),
  );
  // 4. Validate each snapshot structure
  await ArrayUtil.asyncForEach(snapshots.data, async (snapshot) => {
    // Validate snapshot has required fields
    TestValidator.predicate(
      `snapshot has valid id (${snapshot.id})`,
      typeof snapshot.id === "string" && snapshot.id.length > 0,
    );
    TestValidator.predicate(
      `snapshot has valid refund_request_id (${snapshot.refund_request_id})`,
      typeof snapshot.refund_request_id === "string" &&
        snapshot.refund_request_id.length > 0,
    );
    // Validate seller object structure
    TestValidator.predicate(
      `snapshot has seller object`,
      typeof snapshot.seller === "object" && snapshot.seller !== null,
    );
    TestValidator.predicate(
      `seller has valid id (${snapshot.seller.id})`,
      typeof snapshot.seller.id === "string" && snapshot.seller.id.length > 0,
    );
    TestValidator.predicate(
      `seller has valid email (${snapshot.seller.email})`,
      typeof snapshot.seller.email === "string" &&
        snapshot.seller.email.includes("@"),
    );
    TestValidator.predicate(
      `seller has shop_name`,
      typeof snapshot.seller.seller_profile.shop_name === "string" &&
        snapshot.seller.seller_profile.shop_name.length > 0,
    );
    // Validate status fields
    TestValidator.predicate(
      `snapshot has status_before (${snapshot.status_before})`,
      typeof snapshot.status_before === "string" &&
        snapshot.status_before.length > 0,
    );
    TestValidator.predicate(
      `snapshot has status_after (${snapshot.status_after})`,
      typeof snapshot.status_after === "string" &&
        snapshot.status_after.length > 0,
    );
    // Validate response_text can be null or string
    TestValidator.predicate(
      `response_text is null or string`,
      snapshot.response_text === null ||
        typeof snapshot.response_text === "string",
    );
  });
  // 5. Verify snapshots are sorted by created_at descending (if more than one)
  if (snapshots.data.length > 1) {
    TestValidator.predicate("snapshots sorted by created_at descending", () => {
      for (let i = 1; i < snapshots.data.length; i++) {
        const prev = new Date(snapshots.data[i - 1].created_at).getTime();
        const curr = new Date(snapshots.data[i].created_at).getTime();
        if (prev < curr) return false;
      }
      return true;
    });
  }
}
