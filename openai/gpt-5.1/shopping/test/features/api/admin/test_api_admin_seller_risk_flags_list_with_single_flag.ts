import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAccountRiskFlag";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate admin search of seller-related account risk flags when filters
 * target a single seller.
 *
 * Business goal: Ensure that an authenticated admin can call the seller risk
 * flag search endpoint and receive a well-formed paginated response when
 * filtering by sellerId, actor_type="seller", and active=true, in a situation
 * conceptually equivalent to the "single seller flag" scenario.
 *
 * Technical constraints and adaptations:
 *
 * - Only three SDK functions are available:
 *
 *   - Api.functional.auth.admin.join (POST /auth/admin/join)
 *   - Api.functional.shoppingMall.admin.accountRiskFlags.create (POST
 *       /shoppingMall/admin/accountRiskFlags)
 *   - Api.functional.shoppingMall.admin.sellers.accountRiskFlags.index (PATCH
 *       /shoppingMall/admin/sellers/{sellerId}/accountRiskFlags)
 * - There is no SDK for creating sellers or explicitly linking a risk flag to a
 *   seller via a linkage table.
 * - Therefore, the test cannot truly guarantee that a created flag is linked to a
 *   concrete sellerId. We must instead focus on:
 *
 *   - Ensuring admin authentication works and does not block the query.
 *   - Verifying that the seller risk flag index endpoint accepts a UUID sellerId, a
 *       body of type IShoppingMallAccountRiskFlag.IRequest, and returns a page
 *       of IShoppingMallAccountRiskFlag.ISummary records.
 *   - Validating basic pagination metadata and filter behavior for actor_type and
 *       active.
 *
 * Scenario implemented:
 *
 * 1. Admin registration (join):
 *
 *    - Call api.functional.auth.admin.join with a randomly generated
 *         IShoppingMallAdminJoin.ICreate body.
 *    - This should establish admin credentials and automatically set the
 *         Authorization header via the SDK.
 *    - Assert the response shape with typia.assert.
 * 2. Risk flag creation:
 *
 *    - Call api.functional.shoppingMall.admin.accountRiskFlags.create with a body of
 *         type IShoppingMallAccountRiskFlag.ICreate where:
 *
 *         - Actor_type = "seller"
 *         - Code is a random string (e.g., RandomGenerator.alphaNumeric)
 *         - Severity is a fixed business value such as "high"
 *         - Active = true
 *         - Expires_at left undefined to keep the flag non-expiring.
 *    - Assert the created flag with typia.assert.
 *    - Note: We do not attempt any seller linkage because no API for that exists in
 *         the provided materials.
 * 3. Seller risk flag search invocation:
 *
 *    - Generate a random UUID-like sellerId using typia.random<string &
 *         tags.Format<"uuid">>().
 *    - Call api.functional.shoppingMall.admin.sellers.accountRiskFlags.index with:
 *
 *         - SellerId: the random UUID
 *         - Body: IShoppingMallAccountRiskFlag.IRequest constructed as:
 *
 *                           - Page: 1
 *                           - Limit: 10
 *                           - Actor_type: "seller"
 *                           - Active: true
 *                           - Other filters (order_by, severity, code, created_from/to) omitted to keep the
 *                                               query broad.
 *    - Assert the paginated response with typia.assert.
 * 4. Response validations (within constraints):
 *
 *    - Use typia.assert on the IPageIShoppingMallAccountRiskFlag.ISummary result to
 *         guarantee structural type safety including pagination.
 *    - Validate pagination metadata using TestValidator:
 *
 *         - Current page is 1
 *         - Limit is non-negative
 *         - Records >= data.length
 *         - Pages >= 0 (and at least 1 when records > 0).
 *    - For each returned record in data:
 *
 *         - Assert actor_type is "seller" to confirm that the actor_type filter was
 *                   respected.
 *         - Assert active is true to confirm active flag filtering.
 *    - Because no seller linkage API is available, we do NOT assert that the created
 *         flag appears in this list, nor that exactly one record is returned.
 *         Those aspects of the original scenario are not enforceable with the
 *         available SDK.
 * 5. Error scenarios:
 *
 *    - We do not attempt to test unauthorized access or invalid filters, as that
 *         would require constructing additional connections without headers or
 *         relying on behavior not described in the available SDK.
 *
 * Summary:
 *
 * - This test focuses on the happy-path behavior of an authenticated admin
 *   querying seller-related risk flags with actor_type and active filters, and
 *   on validating that the response structure and basic pagination metadata are
 *   consistent. Business rules about exact linkage counts and isolation across
 *   different sellers cannot be fully asserted due to missing linkage APIs.
 */
export async function test_api_admin_seller_risk_flags_list_with_single_flag(
  connection: api.IConnection,
) {
  // 1. Admin registration (join)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Risk flag creation for a seller actor
  const riskFlagCreateBody = {
    actor_type: "seller",
    code: RandomGenerator.alphaNumeric(12),
    reason: RandomGenerator.paragraph({ sentences: 5 }),
    severity: "high",
    active: true,
    // Leave expires_at undefined so that the flag is non-expiring by default.
  } satisfies IShoppingMallAccountRiskFlag.ICreate;

  const createdFlag: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.create(
      connection,
      {
        body: riskFlagCreateBody,
      },
    );
  typia.assert(createdFlag);

  // 3. Invoke seller risk flag index with filters for seller actor and active flag
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const requestBody = {
    page: 1,
    limit: 10,
    actor_type: "seller",
    active: true,
  } satisfies IShoppingMallAccountRiskFlag.IRequest;

  const pageResult: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.sellers.accountRiskFlags.index(
      connection,
      {
        sellerId,
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  // 4. Validate pagination metadata
  const pagination: IPage.IPagination = pageResult.pagination;
  TestValidator.equals("current page should be 1", pagination.current, 1);
  TestValidator.predicate(
    "current page number is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate("limit is non-negative", pagination.limit >= 0);
  TestValidator.predicate(
    "records count is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("pages count is non-negative", pagination.pages >= 0);
  TestValidator.predicate(
    "records should be at least the number of returned data items",
    pagination.records >= pageResult.data.length,
  );

  // 5. Validate that returned flags (if any) match seller/active filters
  for (const summary of pageResult.data) {
    TestValidator.equals(
      "each returned flag must have actor_type 'seller'",
      summary.actor_type,
      "seller",
    );
    TestValidator.equals(
      "each returned flag must be active",
      summary.active,
      true,
    );
  }
}
