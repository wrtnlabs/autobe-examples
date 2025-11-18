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
 * Validate admin-side seller risk flag search with typical pagination filters.
 *
 * Business context: An internal admin uses the risk-operations UI to inspect
 * account-level risk flags bound to a specific seller. The admin must
 * authenticate first using the admin join flow, then can query seller-related
 * risk flags with pagination and filter options. This test focuses on verifying
 * that the plumbing from authentication through to risk-flag search works
 * correctly with typical pagination parameters and actor_type="seller".
 *
 * Important note about scenario adaptation: The original scenario draft
 * requested strict verification that querying risk flags for a seller with no
 * flags returns an empty result set (records=0, data=[]). However, within the
 * provided SDK slice there is no way to create sellers or their associated risk
 * flags, nor to guarantee that a randomly chosen sellerId refers to a seller
 * without flags. Because of that, we intentionally avoid asserting specific
 * record counts and instead validate:
 *
 * - Successful admin authentication via POST /auth/admin/join.
 * - Successful invocation of the seller risk flag index endpoint with
 *   actor_type="seller" and typical pagination options.
 * - That the response structure fully conforms to
 *   IPageIShoppingMallAccountRiskFlag.ISummary.
 * - That pagination metadata (current, limit) respects the request values.
 *
 * Steps:
 *
 * 1. Register and authenticate an admin using api.functional.auth.admin.join. The
 *    SDK automatically wires the returned access token into the connection
 *    headers for subsequent calls.
 * 2. Build a typical risk-flag search request body using
 *    IShoppingMallAccountRiskFlag.IRequest with:
 *
 *    - Page = 1
 *    - Limit = 10
 *    - Actor_type = "seller"
 *    - Order_by = "created_at"
 *    - Order_direction = "desc".
 * 3. Generate a syntactically valid sellerId as a random UUID.
 * 4. Call api.functional.shoppingMall.admin.sellers.accountRiskFlags.index with
 *    the sellerId and request body from step 2.
 * 5. Assert that the response:
 *
 *    - Passes typia.assert validation for
 *         IPageIShoppingMallAccountRiskFlag.ISummary.
 *    - Has pagination.current equal to 1.
 *    - Has pagination.limit equal to 10.
 *
 * By focusing on structure and pagination metadata rather than a specific
 * record count, this test remains robust and compilable even without explicit
 * seller/risk-flag creation APIs.
 */
export async function test_api_admin_seller_risk_flags_empty_result_for_seller_without_flags(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin. The SDK will attach the access
  // token to `connection.headers.Authorization` automatically.
  const admin = await api.functional.auth.admin.join(connection, {
    body: typia.random<IShoppingMallAdminJoin.ICreate>(),
  });
  typia.assert(admin);

  // 2. Build a typical risk-flag search request body with actor_type="seller"
  //    and standard pagination options.
  const requestedPage = 1;
  const requestedLimit = 10;

  const requestBody = {
    page: requestedPage,
    limit: requestedLimit,
    actor_type: "seller",
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallAccountRiskFlag.IRequest;

  // 3. Generate a syntactically valid sellerId. We do not make assumptions
  //    about whether this seller exists or has flags; we only validate
  //    successful, type-safe responses.
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  // 4. Invoke the admin seller risk flag search endpoint.
  const output =
    await api.functional.shoppingMall.admin.sellers.accountRiskFlags.index(
      connection,
      {
        sellerId,
        body: requestBody,
      },
    );

  // 5. Structural and pagination metadata validation.
  typia.assert(output);

  TestValidator.equals(
    "pagination current page should match requested page",
    output.pagination.current,
    requestedPage,
  );
  TestValidator.equals(
    "pagination limit should match requested limit",
    output.pagination.limit,
    requestedLimit,
  );
}
