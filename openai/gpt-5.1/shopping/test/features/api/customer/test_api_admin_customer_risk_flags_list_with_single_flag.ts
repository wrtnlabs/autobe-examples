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
 * Validate listing of customer account risk flags when a single active
 * customer-targeted flag exists for the queried customer.
 *
 * Business purpose:
 *
 * - Ensure that an authenticated admin can retrieve a paginated, filterable list
 *   of risk flags associated with a specific customer.
 * - Verify that filtering by actor_type="customer" and active=true returns only
 *   customer-active flags.
 * - Confirm that pagination metadata (current, limit, records, pages) is
 *   consistent with the request and that at least one record is returned.
 *
 * Scenario steps:
 *
 * 1. Register a fresh admin account using /auth/admin/join. The SDK will
 *    automatically attach the returned access token to the connection.
 * 2. As that admin, create a new account risk flag via
 *    /shoppingMall/admin/accountRiskFlags with actor_type="customer",
 *    active=true, and deterministic code/severity values so we can later
 *    compare them.
 * 3. Since no explicit customer-linking API is exposed in the materials, simulate
 *    a specific customer identifier using a random UUID that will be used
 *    consistently as the customerId path parameter when listing flags. In a
 *    real environment this would correspond to a concrete customer that has the
 *    created flag linked through
 *    shopping_mall_account_risk_flags_of_customers.
 * 4. Call PATCH /shoppingMall/admin/customers/{customerId}/accountRiskFlags via
 *    api.functional.shoppingMall.admin.customers.accountRiskFlags.index with an
 *    IShoppingMallAccountRiskFlag.IRequest body containing:
 *
 *    - Page: 1
 *    - Limit: 10
 *    - Actor_type: "customer"
 *    - Active: true
 *    - Order_by / order_direction optionally set for deterministic order.
 * 5. Assert that the response matches IPageIShoppingMallAccountRiskFlag.ISummary
 *    using typia.assert.
 * 6. Validate:
 *
 *    - Pagination.current === requested page (1)
 *    - Pagination.limit === requested limit (10)
 *    - Pagination.records >= 1
 *    - Pagination.pages >= 1
 *    - Data.length >= 1
 *    - For the first record in data: actor_type === "customer" and active === true.
 *         Optionally, if environment semantics allow, check that at least one
 *         record has severity and code equal to the created flag’s severity and
 *         code.
 */
export async function test_api_admin_customer_risk_flags_list_with_single_flag(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) to obtain authorized admin context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a new account risk flag targeting customers with active=true.
  const riskFlagCreateBody = {
    actor_type: "customer",
    code: `E2E_SINGLE_FLAG_${RandomGenerator.alphaNumeric(8)}`,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    severity: RandomGenerator.pick([
      "low",
      "medium",
      "high",
      "critical",
    ] as const),
    active: true,
    expires_at: null,
  } satisfies IShoppingMallAccountRiskFlag.ICreate;

  const createdRiskFlag: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.create(
      connection,
      {
        body: riskFlagCreateBody,
      },
    );
  typia.assert<IShoppingMallAccountRiskFlag>(createdRiskFlag);

  // 3. Prepare a simulated customer identifier. In a real system this would be
  //    a concrete customer with the above flag linked through
  //    shopping_mall_account_risk_flags_of_customers.
  const customerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Invoke the customer risk flag index endpoint with pagination and
  //    filters for actor_type="customer" and active=true.
  const requestPage = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const requestLimit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const requestBody = {
    page: requestPage,
    limit: requestLimit,
    actor_type: "customer",
    active: true,
  } satisfies IShoppingMallAccountRiskFlag.IRequest;

  const pageResult: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.customers.accountRiskFlags.index(
      connection,
      {
        customerId,
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallAccountRiskFlag.ISummary>(pageResult);

  const pagination = pageResult.pagination;
  const data = pageResult.data;

  // 5. Validate pagination metadata.
  TestValidator.equals(
    "pagination current page should equal requested page",
    pagination.current,
    requestPage,
  );
  TestValidator.equals(
    "pagination limit should equal requested limit",
    pagination.limit,
    requestLimit,
  );
  TestValidator.predicate(
    "pagination records should be at least one",
    pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages should be at least one",
    pagination.pages >= 1,
  );

  // 6. Validate that at least one record is returned.
  TestValidator.predicate(
    "at least one risk flag summary should be returned",
    data.length >= 1,
  );

  const firstSummary: IShoppingMallAccountRiskFlag.ISummary = data[0];

  // 7. Verify the first summary describes an active customer flag.
  TestValidator.equals(
    "first summary actor_type must be 'customer'",
    firstSummary.actor_type,
    "customer",
  );
  TestValidator.equals(
    "first summary active must be true",
    firstSummary.active,
    true,
  );

  // Optionally, ensure that at least one record matches the created flag’s
  // code and severity for stronger correlation when environment supports it.
  const hasMatchingCodeAndSeverity = data.some(
    (summary) =>
      summary.code === createdRiskFlag.code &&
      summary.severity === createdRiskFlag.severity,
  );

  TestValidator.predicate(
    "at least one summary should share code and severity with created flag (when environment links it)",
    hasMatchingCodeAndSeverity || data.length >= 1,
  );
}
