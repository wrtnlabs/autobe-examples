import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationPolicy";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

/**
 * Validate cancellation policy search by free-text keyword and effective
 * window.
 *
 * Business goal: Ensure PATCH /shoppingMall/cancellationPolicies correctly
 * combines:
 *
 * - Free-text search over human-readable fields (name, description)
 * - Effective_from/effective_to window constraints
 * - Pagination metadata integrity while being callable anonymously (no auth
 *   header required for search).
 *
 * High-level flow:
 *
 * 1. Register a fresh platform admin using auth.platformAdmin.join so that we can
 *    create test cancellation policies. This will also configure the connection
 *    with an Authorization header internally via SDK side-effect.
 * 2. As this platform admin, create two policies via
 *    shoppingMall.platformAdmin.cancellationPolicies.create:
 *
 *    - Policy C (the positive match):
 *
 *         - Code: unique string containing a stable prefix (e.g. "HOLIDAY_PROMO_")
 *         - Name: includes distinctive keyword, e.g. "Holiday Promo Flexible".
 *         - Description: also includes the keyword "Holiday Promo".
 *         - Active: true.
 *         - Effective_from/effective_to: cover a specific test window around "now".
 *    - Policy D (should NOT match in main query):
 *
 *         - Different code and name, no "Holiday Promo" keyword in name/description.
 *         - Either: active=false, or effective window completely out of the query window
 *                   (e.g., ended in the past).
 * 3. Build an anonymous connection for the search call by cloning the original
 *    connection but clearing headers to an empty object, in line with the
 *    requirement that PATCH /shoppingMall/cancellationPolicies be callable
 *    without authentication.
 * 4. Construct an IShoppingMallCancellationPolicy.IRequest body that:
 *
 *    - Search: the distinctive keyword ("Holiday Promo").
 *    - EffectiveFromFrom/effectiveToTo (and optionally effectiveFromTo,
 *         effectiveToFrom) define a window that clearly overlaps Policy C's
 *         effective range but not Policy D's if Policy D uses a disjoint
 *         range.
 *    - Page: 1 and limit: a small positive int (e.g. 10).
 *    - OrderBy: a deterministic field like "code" and orderDirection: "asc".
 * 5. Call shoppingMall.cancellationPolicies.index with that body using the
 *    anonymous connection and assert:
 *
 *    - Typia.assert on the result structure.
 *    - Pagination.records >= 1 and data.length >= 1.
 *    - At least one item with code === policyC.code and name === policyC.name
 *         appears in the data array.
 *    - No item with code === policyD.code is present in the result (text + window
 *         filters act as AND conditions).
 * 6. Perform a second search where `search` is a term that matches no existing
 *    policy (e.g. a random UUID string) while keeping the effective window wide
 *    enough. Call index again and assert:
 *
 *    - Typia.assert on the response.
 *    - Pagination.records === 0 and data.length === 0.
 *
 * Practical implementation details:
 *
 * - Use RandomGenerator and typia.random<tags> helpers for generating emails,
 *   URIs, and codes to avoid collisions while staying in valid formats.
 * - For effective_from/effective_to, use new Date() and toISOString() while
 *   respecting that DTO fields are (string & tags.Format<"date-time">) | null.
 * - When constructing request bodies, always use the `satisfies` pattern, e.g.:
 *   const body = { ... } satisfies IShoppingMallCancellationPolicy.IRequest;
 * - Do not manipulate connection.headers beyond the one place where we build a
 *   separate anonymous connection with headers: {}.
 * - Do not perform any type-error or missing-required-field testing; focus only
 *   on valid business flows.
 */
export async function test_api_cancellation_policy_search_by_text_and_effective_window(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin to gain platformAdmin privileges
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.test-shoppingmall.com/join",
    referrer: "https://admin.test-shoppingmall.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  // Validate the authorized admin session structure
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create two cancellation policies with controlled names and effective windows
  const baseNow = new Date();
  const pastDate = new Date(baseNow.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 days ago
  const futureDate = new Date(baseNow.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days later

  const holidayKeyword = "Holiday Promo";

  // Policy C: positive match in both text and effective window
  const policyCBody = {
    code: `HOLIDAY_PROMO_${RandomGenerator.alphaNumeric(8)}`,
    name: `${holidayKeyword} Flexible Policy`,
    description: `${holidayKeyword} cancellation with flexible conditions`,
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 48,
    config_payload: null,
    effective_from: new Date(
      baseNow.getTime() - 24 * 60 * 60 * 1000,
    ).toISOString(), // now -1d
    effective_to: new Date(
      baseNow.getTime() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(), // now +7d
    active: true,
    region_code: null,
    policy_setting_code: null,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const policyC: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      {
        body: policyCBody,
      },
    );
  typia.assert<IShoppingMallCancellationPolicy>(policyC);

  // Policy D: should be excluded; either inactive or outside query window and no keyword
  const policyDBody = {
    code: `GENERIC_POLICY_${RandomGenerator.alphaNumeric(8)}`,
    name: "Generic Standard Policy", // no holidayKeyword
    description: "Standard cancellation rules without holiday promotions.",
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: false,
    max_hours_after_payment: 24,
    config_payload: null,
    // Put it entirely in the past so it does not overlap the query window
    effective_from: new Date(
      pastDate.getTime() - 14 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    effective_to: pastDate.toISOString(),
    active: true,
    region_code: null,
    policy_setting_code: null,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const policyD: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      {
        body: policyDBody,
      },
    );
  typia.assert<IShoppingMallCancellationPolicy>(policyD);

  // 3. Build an anonymous connection (no auth headers) for the public search
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Construct search request targeting the effective window that includes Policy C
  const windowFrom = new Date(
    baseNow.getTime() - 2 * 24 * 60 * 60 * 1000,
  ).toISOString(); // now -2d
  const windowTo = new Date(
    baseNow.getTime() + 10 * 24 * 60 * 60 * 1000,
  ).toISOString(); // now +10d

  const searchRequest = {
    search: holidayKeyword,
    effectiveFromFrom: windowFrom,
    effectiveFromTo: windowTo,
    effectiveToFrom: windowFrom,
    effectiveToTo: windowTo,
    page: 1,
    limit: 10,
    orderBy: "code",
    orderDirection: "asc",
  } satisfies IShoppingMallCancellationPolicy.IRequest;

  const searchResult: IPageIShoppingMallCancellationPolicy.ISummary =
    await api.functional.shoppingMall.cancellationPolicies.index(
      anonymousConnection,
      {
        body: searchRequest,
      },
    );
  typia.assert<IPageIShoppingMallCancellationPolicy.ISummary>(searchResult);

  const pagination = searchResult.pagination;
  const policies = searchResult.data;

  // Basic pagination sanity checks
  TestValidator.predicate(
    "search result should have at least one record for Holiday Promo keyword",
    pagination.records >= 1 && policies.length >= 1,
  );

  // Verify Policy C is present
  const foundPolicyC = policies.find((p) => p.code === policyC.code);
  TestValidator.predicate(
    "Policy C must be included in search results",
    !!foundPolicyC,
  );

  if (foundPolicyC) {
    TestValidator.equals(
      "Policy C name must match created policy",
      foundPolicyC.name,
      policyC.name,
    );
  }

  // Verify Policy D is not present in the result set
  const foundPolicyD = policies.find((p) => p.code === policyD.code);
  TestValidator.predicate(
    "Policy D must be excluded from search results due to text/window filters",
    !foundPolicyD,
  );

  // 6. Negative search: use a term that matches no policies
  const noMatchTerm = RandomGenerator.alphaNumeric(16);
  const noMatchRequest = {
    search: noMatchTerm,
    // Use a wide window so time filters do not artificially exclude
    effectiveFromFrom: new Date(
      baseNow.getTime() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    effectiveFromTo: new Date(
      baseNow.getTime() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    effectiveToFrom: new Date(
      baseNow.getTime() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    effectiveToTo: new Date(
      baseNow.getTime() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    page: 1,
    limit: 10,
    orderBy: "code",
    orderDirection: "asc",
  } satisfies IShoppingMallCancellationPolicy.IRequest;

  const noMatchResult: IPageIShoppingMallCancellationPolicy.ISummary =
    await api.functional.shoppingMall.cancellationPolicies.index(
      anonymousConnection,
      {
        body: noMatchRequest,
      },
    );
  typia.assert<IPageIShoppingMallCancellationPolicy.ISummary>(noMatchResult);

  const noMatchPagination = noMatchResult.pagination;
  const noMatchPolicies = noMatchResult.data;

  TestValidator.equals(
    "no-match search should return zero records in pagination",
    noMatchPagination.records,
    0,
  );
  TestValidator.equals(
    "no-match search should return empty data array",
    noMatchPolicies.length,
    0,
  );
}
