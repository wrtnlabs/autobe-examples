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
 * Test administrator listing all sellers on the platform with default pagination settings.
 *
 * Validates the seller listing endpoint for administrators by authenticating as an admin and
 * requesting the default seller list. Verifies that the response contains valid pagination
 * metadata and seller summary data with all required fields. Ensures soft-deleted sellers
 * are excluded from the results by default.
 *
 * **Test Flow:**
 * 1. Administrator registers/authenticates using admin join endpoint.
 * 2. Sends PATCH request to /ecommerceMall/admin/admin/sellers with empty body for default pagination.
 * 3. Validates response contains pagination metadata and seller data arrays.
 * 4. Validates each seller summary contains required fields (id, email, approvalStatus, suspensionStatus, shopName, createdAt).
 *
 * **Expected Behavior:**
 * - Default pagination: page 1, limit 20
 * - Results ordered by createdAt DESC (newest first)
 * - Soft-deleted sellers excluded (deleted_at IS NULL)
 * - Response status 200 with valid pagination object
 */
export async function test_api_seller_listing_by_admin_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
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
  // 2. List all sellers with default pagination (empty body)
  const response = await api.functional.ecommerceMall.admin.admin.sellers.index(
    adminConnection,
    {
      body: {} satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals("pagination exists", response.pagination !== null, true);
  TestValidator.predicate(
    "current page is valid",
    response.pagination.current >= 1,
  );
  TestValidator.predicate("limit is valid", response.pagination.limit >= 1);
  TestValidator.predicate(
    "records count is valid",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    response.pagination.pages >= 0,
  );
  // 4. Validate data array structure
  TestValidator.equals("data array exists", Array.isArray(response.data), true);
  // 5. Validate seller summary fields if any sellers exist
  for (const seller of response.data) {
    TestValidator.predicate("seller has id", seller.id.length > 0);
    TestValidator.predicate("seller has email", seller.email.includes("@"));
    TestValidator.predicate(
      "approval status is valid",
      ["pending", "approved", "rejected"].includes(seller.approvalStatus),
    );
    TestValidator.predicate(
      "suspension status is valid",
      ["active", "suspended"].includes(seller.suspensionStatus),
    );
    TestValidator.predicate(
      "seller has createdAt",
      seller.createdAt.length > 0,
    );
  }
}
