import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";

/**
 * Validate that platform admins can search customers by lifecycle status and
 * email verification flags via PATCH /shoppingMall/platformAdmin/customers.
 *
 * ## Business goal
 *
 * Ensure that backoffice operators (platform admins) can segment customers for
 * risk/support/lifecycle workflows by:
 *
 * - Filtering on a concrete `status` value; and
 * - Filtering on `is_verified` (true/false); and
 * - Combining both filters together.
 *
 * ## Scope & constraints
 *
 * - Only APIs provided in this test context may be used:
 *
 *   - POST /auth/platformAdmin/join, /auth/platformAdmin/login
 *   - POST /auth/customer/join, /auth/customer/login
 *   - POST /auth/customer/email/verify
 *   - PATCH /shoppingMall/platformAdmin/customers
 * - No API exists here to mutate customer `status` or soft-delete customers, so
 *   we:
 *
 *   - Treat the status exposed in IShoppingMallCustomer.IAuthorized from a freshly
 *       joined customer as the canonical `activeStatus` value.
 *   - Do **not** attempt to create suspended/closed/pending customers nor to
 *       manipulate deletedAt.
 * - Email verification token issuance is out of scope; in this generated
 *   environment we rely on
 *   typia.random<IShoppingMallCustomerAuth.IVerifyEmail>() together with the
 *   simulator backend.
 *
 * ## High-level flow
 *
 * 1. Join a platform admin and keep their credentials active on `connection`.
 * 2. Create N customers (e.g., 4) using /auth/customer/join.
 *
 *    - Immediately capture their authorized envelopes so we know their `status`
 *         (string) for later filtering.
 * 3. For half of those customers, simulate an email verification via
 *    /auth/customer/email/verify.
 *
 *    - We do not depend on the returned IAuthorized’s isVerified flag; the search
 *         endpoint will be the source of truth.
 * 4. Switch authentication back to the platform admin via
 *    /auth/platformAdmin/login (to ensure the search call is authorized with
 *    platformAdmin credentials).
 * 5. Execute multiple search calls to PATCH /shoppingMall/platformAdmin/customers
 *    using api.functional.shoppingMall.platformAdmin.customers.index: a.
 *    Baseline status filter
 *
 *    - Use `status` equal to the status observed from the first customer’s
 *         IAuthorized.status.
 *    - Assert that all returned customer summaries belonging to our created set
 *         respect that status, and that all our customers with that status
 *         appear in the results. b. is_verified = true filter
 *    - Call index with `is_verified: true`.
 *    - Assert that all of our verified test customers appear at least once in the
 *         result set and that none of our unverified ids appear in this subset.
 *         c. is_verified = false filter
 *    - Call index with `is_verified: false`.
 *    - Assert that all of our unverified test customers appear at least once and
 *         that none of our verified ids appear in this subset. d. Combined
 *         status + is_verified filter
 *    - Call index with `status: activeStatus` and `is_verified: true`.
 *    - Assert that all of our customers that are both verified and have activeStatus
 *         appear in the results.
 *
 * ## Implementation notes
 *
 * - Request body for index must satisfy IShoppingMallCustomer.IRequest. We will
 *   set page/limit to small values (e.g., page=1, limit=50) to ensure all our
 *   created customers fit in a single page without assuming an empty database.
 * - We use typia.assert() to validate all API responses’ shapes.
 * - For set membership checks we:
 *
 *   - Track created customer ids and which of them were verified.
 *   - Use TestValidator.predicate and TestValidator.equals for clear assertions.
 */
export async function test_api_platform_admin_customer_search_by_status_and_verification(
  connection: api.IConnection,
) {
  // 1. Join a platform admin so that connection carries platformAdmin token
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const adminJoin = await api.functional.auth.platformAdmin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      name: RandomGenerator.name(),
      password: adminPassword,
      ip: null,
      href: "https://admin.test.local/join",
      referrer: "https://admin.test.local/landing",
    } satisfies IShoppingMallPlatformAdminJoin.IRequest,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminJoin);

  // 2. Create several customers via join
  const customerCount = 4;
  const customers: IShoppingMallCustomer.IAuthorized[] = [];

  for (let i = 0; i < customerCount; i++) {
    const output = await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        ip: null,
        href: "https://shop.test.local/join",
        referrer: "https://shop.test.local/landing",
      } satisfies IShoppingMallCustomerAuth.IJoin,
    });
    typia.assert<IShoppingMallCustomer.IAuthorized>(output);
    customers.push(output);
  }

  TestValidator.equals(
    "created customer count matches expectation",
    customers.length,
    customerCount,
  );

  // Capture the canonical active status from the first customer.
  const activeStatus: string = customers[0].status;

  // 3. Mark half of the customers as verified using the email verification
  //    endpoint. In this generated environment typia.random provides a token
  //    the simulator backend accepts.
  const verifiedIds = new Set<string>();
  const unverifiedIds = new Set<string>();

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];

    if (i % 2 === 0) {
      const verifyResponse =
        await api.functional.auth.customer.email.verify.verifyEmail(
          connection,
          {
            body: typia.random<IShoppingMallCustomerAuth.IVerifyEmail>(),
          },
        );
      typia.assert<IShoppingMallCustomer.IAuthorized>(verifyResponse);
      verifiedIds.add(customer.id);
    } else {
      unverifiedIds.add(customer.id);
    }
  }

  TestValidator.equals(
    "verified + unverified partition equals total customers",
    verifiedIds.size + unverifiedIds.size,
    customers.length,
  );

  // 4. Ensure we are authenticated again as the platform admin before
  //    issuing admin-only search calls.
  const adminLogin = await api.functional.auth.platformAdmin.login(connection, {
    body: {
      email: adminJoin.email,
      password: adminPassword,
      ip: null,
      href: "https://admin.test.local/login",
      referrer: "https://admin.test.local/landing",
    } satisfies IShoppingMallPlatformAdminLogin.IRequest,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminLogin);

  // 5a. Baseline status filter: search by status only.
  const statusSearchBody = {
    page: 1,
    limit: 50,
    status: activeStatus,
  } satisfies IShoppingMallCustomer.IRequest;

  const statusResult =
    await api.functional.shoppingMall.platformAdmin.customers.index(
      connection,
      { body: statusSearchBody },
    );
  typia.assert<IPageIShoppingMallCustomer.ISummary>(statusResult);

  TestValidator.predicate(
    "status filter result pagination limit is at least number of created customers",
    statusResult.pagination.limit >= customers.length,
  );

  const statusResultIds = new Set(
    statusResult.data.map((summary) => summary.id),
  );

  for (const customer of customers) {
    if (customer.status === activeStatus) {
      TestValidator.predicate(
        "created activeStatus customer appears in status-filtered search",
        statusResultIds.has(customer.id),
      );
    }
  }

  // 5b. Filter by is_verified=true only.
  const verifiedSearchBody = {
    page: 1,
    limit: 50,
    is_verified: true,
  } satisfies IShoppingMallCustomer.IRequest;

  const verifiedResult =
    await api.functional.shoppingMall.platformAdmin.customers.index(
      connection,
      { body: verifiedSearchBody },
    );
  typia.assert<IPageIShoppingMallCustomer.ISummary>(verifiedResult);

  const verifiedResultIds = new Set(
    verifiedResult.data.map((summary) => summary.id),
  );

  for (const id of verifiedIds) {
    TestValidator.predicate(
      "verified customer appears in is_verified=true search",
      verifiedResultIds.has(id),
    );
  }

  // 5c. Filter by is_verified=false only.
  const unverifiedSearchBody = {
    page: 1,
    limit: 50,
    is_verified: false,
  } satisfies IShoppingMallCustomer.IRequest;

  const unverifiedResult =
    await api.functional.shoppingMall.platformAdmin.customers.index(
      connection,
      { body: unverifiedSearchBody },
    );
  typia.assert<IPageIShoppingMallCustomer.ISummary>(unverifiedResult);

  const unverifiedResultIds = new Set(
    unverifiedResult.data.map((summary) => summary.id),
  );

  for (const id of unverifiedIds) {
    TestValidator.predicate(
      "unverified customer appears in is_verified=false search",
      unverifiedResultIds.has(id),
    );
  }

  for (const id of verifiedIds) {
    TestValidator.predicate(
      "verified id does not appear in is_verified=false result for test data",
      !unverifiedResultIds.has(id),
    );
  }
  for (const id of unverifiedIds) {
    TestValidator.predicate(
      "unverified id does not appear in is_verified=true result for test data",
      !verifiedResultIds.has(id),
    );
  }

  // 5d. Combined status + is_verified=true filter.
  const combinedSearchBody = {
    page: 1,
    limit: 50,
    status: activeStatus,
    is_verified: true,
  } satisfies IShoppingMallCustomer.IRequest;

  const combinedResult =
    await api.functional.shoppingMall.platformAdmin.customers.index(
      connection,
      { body: combinedSearchBody },
    );
  typia.assert<IPageIShoppingMallCustomer.ISummary>(combinedResult);

  const combinedResultIds = new Set(
    combinedResult.data.map((summary) => summary.id),
  );

  for (const customer of customers) {
    const expectedInCombined =
      customer.status === activeStatus && verifiedIds.has(customer.id);

    if (expectedInCombined) {
      TestValidator.predicate(
        "verified activeStatus customer appears in combined status+is_verified search",
        combinedResultIds.has(customer.id),
      );
    }
  }
}
