import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAuthCredentials } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuthCredentials";
import type { IShoppingMallAuthCredentials } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentials";
import type { IShoppingMallAuthCredentialsActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentialsActor";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate created_at range filtering for auth credentials search.
 *
 * ## Business goal
 *
 * Ensure that PATCH /shoppingMall/authCredentials respects the created_from /
 * created_to filters so that older credentials can be excluded while newer ones
 * are included, and vice versa. The test uses real join flows (customer and
 * platform admin) to create credentials and then queries the credential index
 * to find their created_at timestamps and exercise range boundaries.
 *
 * ## High-level steps
 *
 * 1. Register a first customer via POST /auth/customer/join, creating an older
 *    `shopping_mall_auth_credentials` record for actor_type "customer".
 * 2. Register a platform admin via POST /auth/platformAdmin/join, creating a newer
 *    credentials row (actor_type "platformAdmin") with a later created_at.
 * 3. Call PATCH /shoppingMall/authCredentials without date filters (or with a wide
 *    range) to obtain a page that includes both credentials, then locate the
 *    two corresponding IShoppingMallAuthCredentials.ISummary entries and read
 *    their created_at values.
 * 4. Construct a time range where:
 *
 *    - Created_from is strictly after the older credential's created_at
 *    - Created_to is null (open upper bound) or slightly after the newer credential
 *         and query again. Expect the newer credential to be included and the
 *         older credential to be excluded.
 * 5. Construct a complementary range where created_to is at or before the older
 *    credential's created_at and created_from is null or very early, and query
 *    again. Expect the older credential to be included and the newer one to be
 *    excluded.
 * 6. For each query response, validate the page structure through typia.assert and
 *    verify with TestValidator that all returned credentials satisfy the range
 *    condition on created_at and that the expected inclusions/exclusions hold.
 */
export async function test_api_auth_credentials_filter_by_created_at_range(
  connection: api.IConnection,
) {
  // 1. Register an "older" customer credential via /auth/customer/join
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  const customerEmail: string = customerAuthorized.email;

  // 2. Register a "newer" platform admin credential via /auth/platformAdmin/join
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuthorized);

  const platformAdminEmail: string = platformAdminAuthorized.email;

  // 3. Fetch credentials page that should include both just-created credentials.
  //    We filter by login_identifier emails to reduce noise and request a
  //    reasonably high limit to avoid pagination missing them.
  const initialSearchBody = {
    actor_type: undefined,
    login_identifier: undefined,
    status: undefined,
    has_risk_flags: null,
    created_from: null,
    created_to: null,
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    cursor: null,
    order_by: "created_at",
    order_direction: "asc",
  } satisfies IShoppingMallAuthCredentials.IRequest;

  const initialPage: IPageIShoppingMallAuthCredentials.ISummary =
    await api.functional.shoppingMall.authCredentials.index(connection, {
      body: initialSearchBody,
    });
  typia.assert<IPageIShoppingMallAuthCredentials.ISummary>(initialPage);

  const allCredentials: IShoppingMallAuthCredentials.ISummary[] =
    initialPage.data;

  // locate our two credentials by email
  const customerCredential = allCredentials.find(
    (cred) => cred.email === customerEmail,
  );
  const platformAdminCredential = allCredentials.find(
    (cred) => cred.email === platformAdminEmail,
  );

  TestValidator.predicate(
    "customer credential must be found in initial credentials page",
    !!customerCredential,
  );
  TestValidator.predicate(
    "platform admin credential must be found in initial credentials page",
    !!platformAdminCredential,
  );

  if (!customerCredential || !platformAdminCredential) return;

  const customerCreatedAt: string & tags.Format<"date-time"> =
    customerCredential.created_at;
  const platformAdminCreatedAt: string & tags.Format<"date-time"> =
    platformAdminCredential.created_at;

  // sanity: ensure customer credential is older or equal
  TestValidator.predicate(
    "customer credential should not be created after platform admin credential",
    new Date(customerCreatedAt).getTime() <=
      new Date(platformAdminCreatedAt).getTime(),
  );

  // derive a created_from after the customer credential but not after the admin
  const customerCreatedTime = new Date(customerCreatedAt).getTime();
  const adminCreatedTime = new Date(platformAdminCreatedAt).getTime();
  const midpointTime =
    customerCreatedTime +
    Math.max(1, Math.floor((adminCreatedTime - customerCreatedTime) / 2));
  const createdFromAfterCustomer = new Date(midpointTime).toISOString();

  // 4. Query with created_from after older credential; expect only newer credential
  const newerOnlySearchBody = {
    actor_type: undefined,
    login_identifier: undefined,
    status: undefined,
    has_risk_flags: null,
    created_from: createdFromAfterCustomer as string & tags.Format<"date-time">,
    created_to: null,
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    cursor: null,
    order_by: "created_at",
    order_direction: "asc",
  } satisfies IShoppingMallAuthCredentials.IRequest;

  const newerOnlyPage: IPageIShoppingMallAuthCredentials.ISummary =
    await api.functional.shoppingMall.authCredentials.index(connection, {
      body: newerOnlySearchBody,
    });
  typia.assert<IPageIShoppingMallAuthCredentials.ISummary>(newerOnlyPage);

  const newerOnlyData = newerOnlyPage.data;

  // Assert no credential older than createdFromAfterCustomer is returned
  for (const cred of newerOnlyData) {
    TestValidator.predicate(
      "credential in newerOnlyPage must satisfy created_at >= created_from",
      new Date(cred.created_at).getTime() >= midpointTime,
    );
  }

  const newerIncluded = newerOnlyData.some(
    (c) => c.id === platformAdminCredential.id,
  );
  const olderExcluded = !newerOnlyData.some(
    (c) => c.id === customerCredential.id,
  );

  TestValidator.predicate(
    "newer platform admin credential must be included when filtering from midpoint",
    newerIncluded,
  );
  TestValidator.predicate(
    "older customer credential must be excluded when filtering from midpoint",
    olderExcluded,
  );

  // 5. Complementary query: created_to at or before customerCreatedAt, to include
  //    the older credential and exclude the newer one.
  const olderOnlySearchBody = {
    actor_type: undefined,
    login_identifier: undefined,
    status: undefined,
    has_risk_flags: null,
    created_from: null,
    created_to: customerCreatedAt,
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    cursor: null,
    order_by: "created_at",
    order_direction: "asc",
  } satisfies IShoppingMallAuthCredentials.IRequest;

  const olderOnlyPage: IPageIShoppingMallAuthCredentials.ISummary =
    await api.functional.shoppingMall.authCredentials.index(connection, {
      body: olderOnlySearchBody,
    });
  typia.assert<IPageIShoppingMallAuthCredentials.ISummary>(olderOnlyPage);

  const olderOnlyData = olderOnlyPage.data;

  for (const cred of olderOnlyData) {
    TestValidator.predicate(
      "credential in olderOnlyPage must satisfy created_at <= created_to",
      new Date(cred.created_at).getTime() <= customerCreatedTime,
    );
  }

  const olderIncluded = olderOnlyData.some(
    (c) => c.id === customerCredential.id,
  );
  const newerExcluded = !olderOnlyData.some(
    (c) => c.id === platformAdminCredential.id,
  );

  TestValidator.predicate(
    "older customer credential must be included when filtering up to its created_at",
    olderIncluded,
  );
  TestValidator.predicate(
    "newer platform admin credential must be excluded when filtering up to customer created_at",
    newerExcluded,
  );
}
