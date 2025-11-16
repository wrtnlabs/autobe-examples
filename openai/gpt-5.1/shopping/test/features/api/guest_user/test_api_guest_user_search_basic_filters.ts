import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuestuser";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify platform admin guest user search with basic filters and pagination.
 *
 * Business goal: Ensure that an authenticated platform admin can search
 * persisted guest user identities with simple filters (temporary_identifier &
 * search) and that the search endpoint returns a properly paginated, correctly
 * ordered list of matching guest users.
 *
 * Scenario steps:
 *
 * 1. Register a platform admin using POST /auth/platformAdmin/join.
 *
 *    - Use typia.random<IShoppingMallPlatformAdminJoin.IRequest>() to build a valid
 *         join request.
 *    - The SDK automatically stores the issued access token into
 *         connection.headers.Authorization, so no manual header handling.
 * 2. Create a small fixture set of guest users via POST
 *    /shoppingMall/platformAdmin/guestUsers.
 *
 *    - Build two groups of guests: a) Matching group: all share a common
 *         temporary_identifier prefix or exact value we will later filter on.
 *         b) Non-matching group: have different temporary_identifier values to
 *         ensure they are excluded by filters.
 *    - Also vary user_agent strings (e.g., "Mozilla/5.0 ...", "MobileSafari ...") so
 *         we can optionally demonstrate user_agent-based filtering if desired.
 *    - Use deterministic values for at least one identifier key instead of fully
 *         random data so that we can construct the search request body in a
 *         reproducible way.
 * 3. Call PATCH /shoppingMall/platformAdmin/guestUsers using
 *    api.functional.shoppingMall.platformAdmin.guestUsers.index with
 *    IShoppingMallGuestUser.IRequest as body.
 *
 *    - First query: basic filter by temporary_identifier for the matching group
 *         only.
 *
 *         - Set page = 1 (or 0/1 depending on backend semantics; here request uses
 *                   1-based page index by description, but pagination metadata
 *                   returns 0-based `current` index).
 *         - Choose a small limit value (e.g., 2) smaller than the number of matching
 *                   guests to verify pagination.
 *         - Set temporary_identifier to the exact value used when creating the matching
 *                   group.
 *         - Set order_by = "created_at", order_direction = "desc".
 *    - Optionally, run a second query that uses `search` with the same identifier
 *         value to validate that search-based filtering produces equivalent or
 *         compatible results, depending on server implementation.
 * 4. Validate response structure and business rules.
 *
 *    - Call typia.assert<IPageIShoppingMallGuestuser.ISummary>(response) to fully
 *         validate response type.
 *    - Check pagination metadata:
 *
 *         - Pagination.limit should equal the requested limit or a capped value (we
 *                   primarily ensure it is > 0 and <= requested limit).
 *         - Pagination.records should be equal to the total number of guest users that
 *                   match the given filter criteria (i.e., our matching group
 *                   size). Since the backend might apply its own internal
 *                   constraints, we verify that pagination.records is >= the
 *                   number of items returned in `data` and that
 *                   pagination.pages is consistent with records and limit.
 *         - Pagination.current should be 0 for the first page response as described by
 *                   IPage.IPagination.
 *    - Validate that all `data` items match the filter:
 *
 *         - For the temporary_identifier filter, every summary.id must correspond to a
 *                   guest we created in the matching group.
 *         - No ids from the non-matching group should appear.
 *         - Because the response uses IShoppingMallGuestUser.ISummary, which does not
 *                   expose temporary_identifier directly, we validate by
 *                   cross-checking ids against our in-memory list of created
 *                   guests.
 *    - Validate ordering:
 *
 *         - For `order_by = "created_at"` and `order_direction = "desc"`, ensure that the
 *                   returned data summaries are sorted by createdAt
 *                   descending.
 * 5. Error cases are not type errors.
 *
 *    - We do not test TypeScript-level type violations or missing required fields;
 *         all requests must be fully type-safe and compilable.
 *    - We also do not verify specific HTTP status codes (e.g., 400, 404). Instead,
 *         we focus solely on the success path and business logic.
 */
export async function test_api_guest_user_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and get authorized session
  const joinRequest = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Create guest user fixtures: matching and non-matching groups
  const commonIdentifier = RandomGenerator.alphaNumeric(16);

  const matchingGuests: IShoppingMallGuestUser[] = [];
  const nonMatchingGuests: IShoppingMallGuestUser[] = [];

  // Create 5 matching guests
  for (let i = 0; i < 5; i++) {
    const guest =
      await api.functional.shoppingMall.platformAdmin.guestUsers.create(
        connection,
        {
          body: {
            temporary_identifier: commonIdentifier,
            user_agent: `Mozilla/5.0 (matching-${i})`,
          } satisfies IShoppingMallGuestUser.ICreate,
        },
      );
    typia.assert(guest);
    matchingGuests.push(guest);
  }

  // Create 3 non-matching guests
  for (let i = 0; i < 3; i++) {
    const guest =
      await api.functional.shoppingMall.platformAdmin.guestUsers.create(
        connection,
        {
          body: {
            temporary_identifier: RandomGenerator.alphaNumeric(16),
            user_agent: `Mozilla/5.0 (non-matching-${i})`,
          } satisfies IShoppingMallGuestUser.ICreate,
        },
      );
    typia.assert(guest);
    nonMatchingGuests.push(guest);
  }

  // 3. Query guest users with basic filter and pagination
  const requestedLimit = 2;
  const searchRequest = {
    page: 1,
    limit: requestedLimit,
    temporary_identifier: commonIdentifier,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallGuestUser.IRequest;

  const pageResult: IPageIShoppingMallGuestuser.ISummary =
    await api.functional.shoppingMall.platformAdmin.guestUsers.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(pageResult);

  const pagination = pageResult.pagination;
  const data = pageResult.data;

  // 4-a. Validate pagination metadata
  TestValidator.predicate("pagination limit positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination limit does not exceed requested limit",
    pagination.limit <= requestedLimit,
  );

  TestValidator.predicate(
    "records at least number of returned data items",
    pagination.records >= data.length,
  );

  if (pagination.records > 0) {
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "pages consistent with records and limit",
      pagination.pages,
      expectedPages,
    );
  } else {
    TestValidator.equals("no pages when no records", pagination.pages, 0);
  }

  TestValidator.equals("first page current index is 0", pagination.current, 0);

  // 4-b. Validate filter correctness using our in-memory fixtures
  const matchingIds = new Set(matchingGuests.map((g) => g.id));
  const nonMatchingIds = new Set(nonMatchingGuests.map((g) => g.id));

  for (const summary of data) {
    // Summary type ensures id/createdAt/updatedAt presence
    TestValidator.predicate(
      "summary id must be one of matching guest ids",
      matchingIds.has(summary.id),
    );
    TestValidator.predicate(
      "summary id must not be one of non-matching guest ids",
      !nonMatchingIds.has(summary.id),
    );
  }

  // 4-c. Validate ordering by createdAt descending
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    TestValidator.predicate(
      "results sorted by createdAt desc",
      prev.createdAt >= curr.createdAt,
    );
  }

  // Optional second query using `search` field to match the same identifier.
  const searchBySearchRequest = {
    page: 1,
    limit: requestedLimit,
    search: commonIdentifier,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallGuestUser.IRequest;

  const searchBySearchResult: IPageIShoppingMallGuestuser.ISummary =
    await api.functional.shoppingMall.platformAdmin.guestUsers.index(
      connection,
      {
        body: searchBySearchRequest,
      },
    );
  typia.assert(searchBySearchResult);

  const searchData = searchBySearchResult.data;

  // Ensure that every result from search-based query is either from
  // the matching group or at least overlaps with the temporary_identifier
  // based query (depending on implementation). Here we assert it is a
  // subset of all created guest ids and primarily check that it does not
  // contain non-matching ids.
  const allCreatedIds = new Set(
    matchingGuests.concat(nonMatchingGuests).map((g) => g.id),
  );

  for (const summary of searchData) {
    TestValidator.predicate(
      "search-based summary id belongs to created guests",
      allCreatedIds.has(summary.id),
    );
    TestValidator.predicate(
      "search-based result does not include known non-matching ids",
      !nonMatchingIds.has(summary.id),
    );
  }
}
