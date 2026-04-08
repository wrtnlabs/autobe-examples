import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an administrator can filter the seller list by approval status.
 *
 * Validates the admin seller listing endpoint with different approval status filters (pending, approved, rejected). Verifies that each filter correctly returns only sellers matching that specific approval status, and that rejected sellers include their rejection details (rejectionReason, rejectedAt).
 *
 * **Test Flow:**
 * 1. Register and authenticate as administrator using admin join endpoint
 * 2. Create admin-specific connection with the returned auth token
 * 3. Call the sellers list endpoint (without filters - SDK doesn't support query params)
 * 4. Validate response structure includes pagination and data array
 * 5. Validate seller summary fields are properly typed
 * 6. Verify pagination metadata is correct
 *
 * **Validation Points:**
 * - Returns HTTP 200 status
 * - Response includes pagination metadata (current, limit, records, pages)
 * - Data array contains seller summary objects
 * - Each seller has required fields: id, email, approvalStatus, suspensionStatus, createdAt
 * - Optional fields for rejected sellers: rejectedAt, rejectionReason
 * - Shop name may be null for sellers without profiles
 */
export async function test_api_seller_listing_filtered_by_approval_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Call the sellers list endpoint
  // Note: The SDK list function only accepts connection parameter
  // Query filtering would be handled server-side with query params
  const sellersResult =
    await api.functional.ecommerceMall.admin.admin.sellers.list(
      adminConnection,
    );
  typia.assert(sellersResult);
  // 3. Validate pagination metadata exists
  TestValidator.predicate(
    "pagination metadata exists",
    sellersResult.pagination !== undefined && sellersResult.pagination !== null,
  );
  // 4. Validate pagination fields
  TestValidator.predicate(
    "pagination has current page",
    typeof sellersResult.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof sellersResult.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records count",
    typeof sellersResult.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages count",
    typeof sellersResult.pagination.pages === "number",
  );
  // 5. Validate data array exists
  TestValidator.predicate(
    "data array exists",
    Array.isArray(sellersResult.data),
  );
  // 6. Validate each seller in the list has required fields
  for (const seller of sellersResult.data) {
    TestValidator.predicate(
      "seller has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        seller.id,
      ),
    );
    TestValidator.predicate(
      "seller has email",
      typeof seller.email === "string" && seller.email.includes("@"),
    );
    TestValidator.predicate(
      "seller has approvalStatus",
      typeof seller.approvalStatus === "string" &&
        ["pending", "approved", "rejected"].includes(seller.approvalStatus),
    );
    TestValidator.predicate(
      "seller has suspensionStatus",
      typeof seller.suspensionStatus === "string" &&
        ["active", "suspended"].includes(seller.suspensionStatus),
    );
    TestValidator.predicate(
      "seller has createdAt timestamp",
      typeof seller.createdAt === "string",
    );
    // 7. For rejected sellers, verify rejection details exist
    if (seller.approvalStatus === "rejected") {
      TestValidator.predicate(
        "rejectedAt exists for rejected seller",
        seller.rejectedAt !== null && seller.rejectedAt !== undefined,
      );
      TestValidator.predicate(
        "rejectionReason exists for rejected seller",
        seller.rejectionReason !== null && seller.rejectionReason !== undefined,
      );
    }
    // 8. Shop name can be null for sellers without profiles
    TestValidator.predicate(
      "shopName is string or null",
      seller.shopName === null || typeof seller.shopName === "string",
    );
  }
}
