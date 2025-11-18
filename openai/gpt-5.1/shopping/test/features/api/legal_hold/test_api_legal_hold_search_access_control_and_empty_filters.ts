import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLegalHold";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";

/**
 * Validate access control and default filtering for legal hold search.
 *
 * Business goals:
 *
 * - Ensure that only authenticated admins can call PATCH
 *   /shoppingMall/admin/legalHolds.
 * - Ensure that unauthenticated callers and authenticated customers are both
 *   rejected.
 * - Ensure that admins can search legal holds using a minimal, mostly-unfiltered
 *   IShoppingMallLegalHold.IRequest body (only page and limit), and that the
 *   endpoint returns a bounded page of summaries without applying unexpected
 *   default filters.
 *
 * Test workflow:
 *
 * 1. Prepare an unauthenticated connection by cloning the given connection but
 *    clearing headers. Using this unauthenticated connection, call
 *    shoppingMall.admin.legalHolds.index with a minimal body { page: 1, limit:
 *    5 }. Expect the call to fail and wrap it in TestValidator.error with a
 *    clear title. Do not assert a specific HTTP status code.
 * 2. Register a new customer via api.functional.auth.customer.join using a random
 *    but valid IShoppingMallCustomerJoin.IRequest. This call both creates the
 *    customer and authenticates as that customer on the original connection
 *    (Authorization header is set automatically by the SDK). Assert the
 *    response with typia.assert.
 * 3. As the authenticated customer, attempt to call
 *    api.functional.shoppingMall.admin.legalHolds.index again with a simple
 *    IRequest body specifying only page and limit. Wrap this in await
 *    TestValidator.error(...) to confirm that customers cannot access this
 *    admin-only endpoint. Again, do not check status codes.
 * 4. Register and authenticate an admin using api.functional.auth.admin.join with
 *    a valid IShoppingMallAdminJoin.ICreate body. This will overwrite the
 *    Authorization header on the same connection, effectively switching the
 *    actor to an admin. Assert the response using typia.assert.
 * 5. While authenticated as the admin, create several legal holds via
 *    api.functional.shoppingMall.admin.legalHolds.create. Use
 *    IShoppingMallLegalHold.ICreate with random but coherent values for code,
 *    title, status (e.g., "active"), and optional fields. Repeat a few times in
 *    a simple loop to ensure the search has some data to return. typia.assert
 *    each created record to confirm type safety.
 * 6. Still as the admin, perform a search via
 *    api.functional.shoppingMall.admin.legalHolds.index with an
 *    IShoppingMallLegalHold.IRequest body that sets only page and limit (e.g.,
 *    page: 1, limit: 5) and leaves all other filters undefined. Assert the
 *    response with typia.assert<IPageIShoppingMallLegalHold.ISummary>. Then add
 *    business-level checks:
 *
 *    - Use TestValidator.predicate with a descriptive title to verify that
 *         pagination.limit is greater than 0 and less than or equal to the
 *         requested limit.
 *    - Verify that pagination.records is >= data.length.
 *    - Assert that data.length is <= the requested limit.
 *    - If data is non-empty, verify that each element has a non-empty code and title
 *         strings using simple boolean checks.
 * 7. The test completes without cleaning up data, because this is a
 *    non-destructive search scenario and AutoBE environments typically use
 *    isolated test databases.
 */
export async function test_api_legal_hold_search_access_control_and_empty_filters(
  connection: api.IConnection,
) {
  // 1. Unauthenticated access should fail.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const unauthBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallLegalHold.IRequest;

  await TestValidator.error(
    "unauthenticated legal hold search must be rejected",
    async () => {
      await api.functional.shoppingMall.admin.legalHolds.index(unauthConn, {
        body: unauthBody,
      });
    },
  );

  // 2. Register and authenticate a customer.
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 3. Customer-authenticated access should also fail.
  const customerSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallLegalHold.IRequest;

  await TestValidator.error(
    "customer must not access admin legal hold search",
    async () => {
      await api.functional.shoppingMall.admin.legalHolds.index(connection, {
        body: customerSearchBody,
      });
    },
  );

  // 4. Register and authenticate an admin.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 5. Create several legal holds as admin.
  const persistedHolds: IShoppingMallLegalHold[] = [];
  const createCount = 5;
  for (let index = 0; index < createCount; index++) {
    const createBody = {
      code: `LH-${RandomGenerator.alphaNumeric(8)}-${index}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      status: "active",
      description: RandomGenerator.paragraph({ sentences: 6 }),
      scope_description: RandomGenerator.paragraph({ sentences: 4 }),
      external_reference: RandomGenerator.alphaNumeric(12),
      effective_from: new Date().toISOString() as string &
        tags.Format<"date-time">,
    } satisfies IShoppingMallLegalHold.ICreate;

    const created: IShoppingMallLegalHold =
      await api.functional.shoppingMall.admin.legalHolds.create(connection, {
        body: createBody,
      });
    typia.assert(created);
    persistedHolds.push(created);
  }

  TestValidator.predicate(
    "at least one legal hold must have been created",
    persistedHolds.length > 0,
  );

  // 6. Admin performs unfiltered search with only page and limit.
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 5 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const searchBody = {
    page,
    limit,
  } satisfies IShoppingMallLegalHold.IRequest;

  const pageResult: IPageIShoppingMallLegalHold.ISummary =
    await api.functional.shoppingMall.admin.legalHolds.index(connection, {
      body: searchBody,
    });
  typia.assert(pageResult);

  const pagination = pageResult.pagination;
  TestValidator.predicate(
    "pagination.limit should be positive",
    pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination.limit should not exceed requested limit",
    pagination.limit <= limit,
  );

  TestValidator.predicate(
    "pagination.records should be at least data.length",
    pagination.records >= pageResult.data.length,
  );

  TestValidator.predicate(
    "data length should not exceed requested limit",
    pageResult.data.length <= limit,
  );

  if (pageResult.data.length > 0) {
    for (const summary of pageResult.data) {
      TestValidator.predicate(
        "legal hold summary.code must be non-empty",
        summary.code.length > 0,
      );
      TestValidator.predicate(
        "legal hold summary.title must be non-empty",
        summary.title.length > 0,
      );
    }
  }
}
