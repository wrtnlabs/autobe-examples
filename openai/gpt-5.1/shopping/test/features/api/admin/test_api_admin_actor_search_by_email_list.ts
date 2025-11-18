import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallActorSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallActorSearch";
import type { IShoppingMallActorSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSearch";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate admin actor search by email list filter.
 *
 * Business purpose:
 *
 * - Ensure governance/admin staff can search for actors (including admins) by a
 *   list of known email addresses using the unified actor search endpoint.
 * - Confirm that when the `emails` filter is provided, any returned actor with an
 *   exposed email has that email contained in the requested email list (OR
 *   semantics across the list).
 * - Sanity check pagination metadata against the requested page/limit and actual
 *   data length.
 *
 * Test steps:
 *
 * 1. Register a new admin via POST /auth/admin/join. This also establishes the
 *    admin authentication context through the SDK (Authorization header
 *    management is automatically handled).
 * 2. Perform an initial search with a purely random list of valid email addresses
 *    as the filter to:
 *
 *    - Confirm the search endpoint works with the `emails` filter present.
 *    - Validate that no returned actor has an email outside that filter set.
 * 3. Perform a second search where the emails list contains:
 *
 *    - The just-registered admin's email.
 *    - An additional random email which is unlikely to exist. This is used to:
 *    - Increase the likelihood of a positive match (the admin actor) being present
 *         in the results.
 *    - Confirm that emails filter is treated as a logical OR over the list of
 *         values.
 *    - Again, verify that every returned email (if present) belongs to the requested
 *         set.
 * 4. For both searches, verify pagination metadata:
 *
 *    - Pagination.current equals the requested page (1).
 *    - Pagination.limit equals the requested limit.
 *    - Data.length is less than or equal to pagination.limit.
 *    - Pagination.records and pagination.pages are non-negative and consistent
 *         (e.g., when records <= limit then pages should be 0 or 1 depending on
 *         implementation).
 */
export async function test_api_admin_actor_search_by_email_list(
  connection: api.IConnection,
) {
  // 1. Register a new admin to establish authentication context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.console.test/join",
    referrer: "https://admin.console.test/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const adminEmail = adminAuthorized.email;

  // Common pagination config
  const page: number & tags.Type<"int32"> & tags.Minimum<1> = 1 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const limit: number & tags.Type<"int32"> & tags.Minimum<1> = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  // Helper to validate pagination metadata against returned data
  const assertPagination = (
    title: string,
    pagination: IPage.IPagination,
    dataLength: number,
  ): void => {
    // Basic structure assertions
    typia.assert<IPage.IPagination>(pagination);

    TestValidator.equals(
      `${title} - current page matches request`,
      pagination.current,
      page,
    );
    TestValidator.equals(
      `${title} - limit matches request`,
      pagination.limit,
      limit,
    );

    // dataLength must not exceed page limit
    TestValidator.predicate(
      `${title} - data length <= limit`,
      dataLength <= (pagination.limit as number),
    );

    // records and pages should be non-negative (already guaranteed by type tags,
    // but we add a semantic check on pages vs records where possible).
    TestValidator.predicate(
      `${title} - records non-negative`,
      (pagination.records as number) >= 0,
    );
    TestValidator.predicate(
      `${title} - pages non-negative`,
      (pagination.pages as number) >= 0,
    );

    if ((pagination.records as number) <= (pagination.limit as number)) {
      TestValidator.predicate(
        `${title} - pages is 0 or 1 when records <= limit`,
        (pagination.pages as number) === 0 ||
          (pagination.pages as number) === 1,
      );
    }
  };

  // Helper to assert all returned emails (if present) are within requestedEmails
  const assertEmailsWithinFilter = (
    title: string,
    requestedEmails: string[],
    result: IPageIShoppingMallActorSearch.ISummary,
  ): void => {
    const emailSet = new Set(requestedEmails);

    for (const actor of result.data) {
      typia.assert<IShoppingMallActorSearch.ISummary>(actor);

      if (actor.email !== undefined) {
        TestValidator.predicate(
          `${title} - actor email in requested emails`,
          emailSet.has(actor.email),
        );
      }
    }
  };

  // 2. First search: random emails list only
  const randomEmails: string[] = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"email">>(),
  );

  const firstRequestBody = {
    query: null,
    actor_types: null,
    emails: randomEmails,
    phone_numbers: null,
    status: null,
    registered_from: null,
    registered_to: null,
    page,
    limit,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallActorSearch.IRequest;

  const firstResult: IPageIShoppingMallActorSearch.ISummary =
    await api.functional.shoppingMall.admin.actors.search.index(connection, {
      body: firstRequestBody,
    });
  typia.assert<IPageIShoppingMallActorSearch.ISummary>(firstResult);

  assertPagination(
    "first search",
    firstResult.pagination,
    firstResult.data.length,
  );
  assertEmailsWithinFilter("first search", randomEmails, firstResult);

  // 3. Second search: include admin email plus an extra random email
  const secondEmails: string[] = [
    adminEmail,
    typia.random<string & tags.Format<"email">>(),
  ];

  const secondRequestBody = {
    query: null,
    actor_types: null,
    emails: secondEmails,
    phone_numbers: null,
    status: null,
    registered_from: null,
    registered_to: null,
    page,
    limit,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallActorSearch.IRequest;

  const secondResult: IPageIShoppingMallActorSearch.ISummary =
    await api.functional.shoppingMall.admin.actors.search.index(connection, {
      body: secondRequestBody,
    });
  typia.assert<IPageIShoppingMallActorSearch.ISummary>(secondResult);

  assertPagination(
    "second search",
    secondResult.pagination,
    secondResult.data.length,
  );
  assertEmailsWithinFilter("second search", secondEmails, secondResult);

  // Optional additional OR-semantics sanity check: if any actor email is present,
  // assert at least one of them equals the admin email for stronger coverage.
  const actorsWithEmail = secondResult.data.filter(
    (actor) => actor.email !== undefined,
  );
  if (actorsWithEmail.length > 0) {
    const hasAdminEmail = actorsWithEmail.some(
      (actor) => actor.email === adminEmail,
    );

    TestValidator.predicate(
      "second search - at least one actor with email matches admin email when any emails are returned",
      hasAdminEmail || actorsWithEmail.length === 0,
    );
  }
}
