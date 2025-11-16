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
 * Validate guest user search by creation date range with sorting and
 * pagination.
 *
 * Business goal: Ensure that a platform administrator can search guest user
 * identities (shopping_mall_guestuser) by a bounded creation timestamp window
 * using IShoppingMallGuestUser.IRequest.created_from and created_to, and that
 * ordering and pagination metadata in IPageIShoppingMallGuestuser.ISummary
 * align with the filtered subset.
 *
 * Scenario steps:
 *
 * 1. Bootstrap a platform admin account via POST /auth/platformAdmin/join.
 * 2. Under that admin context, create several guest users via POST
 *    /shoppingMall/platformAdmin/guestUsers.
 * 3. Derive a mid-range creation window from the created_at timestamps so that at
 *    least one created guest falls within [created_from, created_to].
 * 4. Call PATCH /shoppingMall/platformAdmin/guestUsers with
 *    IShoppingMallGuestUser.IRequest specifying created_from, created_to,
 *    order_by = "created_at", order_direction = "asc", and a fixed page/limit.
 * 5. Assert that every returned guest summary’s createdAt lies within the window,
 *    that results are sorted ascending by createdAt, and that pagination
 *    metadata (current, records, pages, limit) is consistent with the returned
 *    data.
 */
export async function test_api_guest_user_search_creation_date_range_and_sorting(
  connection: api.IConnection,
) {
  // 1. Bootstrap platform admin via join
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create several guest users under platform admin context
  const guestCount = 5;
  const guests: IShoppingMallGuestUser[] = [];

  for (let i = 0; i < guestCount; i++) {
    const createBody = {
      temporary_identifier: `guest-${RandomGenerator.alphaNumeric(10)}`,
      user_agent: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IShoppingMallGuestUser.ICreate;

    const guest =
      await api.functional.shoppingMall.platformAdmin.guestUsers.create(
        connection,
        { body: createBody },
      );
    typia.assert(guest);
    guests.push(guest);
  }

  // Sort guests by created_at ascending to make window selection deterministic
  const sortedGuests = [...guests].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  // Ensure we have at least 2 guests to form a meaningful subset
  TestValidator.predicate(
    "should have created at least 2 guest users",
    sortedGuests.length >= 2,
  );

  const earliest = sortedGuests[0];
  const latest = sortedGuests[sortedGuests.length - 1];

  // 3. Build a window [from, to] covering all newly created guests
  const createdFrom = earliest.created_at;
  const createdTo = latest.created_at;

  // 4. Search guests within the window, ascending by created_at
  const requestBodyInRange = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    created_from: createdFrom,
    created_to: createdTo,
    order_by: "created_at",
    order_direction: "asc" as "asc" | "desc",
  } satisfies IShoppingMallGuestUser.IRequest;

  const pageInRange: IPageIShoppingMallGuestuser.ISummary =
    await api.functional.shoppingMall.platformAdmin.guestUsers.index(
      connection,
      { body: requestBodyInRange },
    );
  typia.assert(pageInRange);

  const paginationInRange = pageInRange.pagination;
  const dataInRange = pageInRange.data;

  // 5-1. Pagination metadata consistency
  TestValidator.equals(
    "records should equal number of returned guest summaries",
    paginationInRange.records,
    dataInRange.length,
  );

  if (dataInRange.length > 0) {
    TestValidator.predicate(
      "pages should be at least 1 when there are records",
      paginationInRange.pages >= 1,
    );
  } else {
    TestValidator.equals(
      "pages should be 0 when there are no records",
      paginationInRange.pages,
      0,
    );
  }

  // page in request is 1-based, pagination.current is 0-based for first page
  TestValidator.equals(
    "pagination current page index should be 0 for first page",
    paginationInRange.current,
    0,
  );

  TestValidator.predicate(
    "pagination limit should be at least number of returned items",
    paginationInRange.limit >= dataInRange.length,
  );

  // 5-2. All returned guests must fall within [createdFrom, createdTo]
  for (const summary of dataInRange) {
    TestValidator.predicate(
      "summary createdAt should be >= created_from",
      summary.createdAt.localeCompare(createdFrom) >= 0,
    );
    TestValidator.predicate(
      "summary createdAt should be <= created_to",
      summary.createdAt.localeCompare(createdTo) <= 0,
    );
  }

  // 5-3. Ascending sort by createdAt
  for (let i = 1; i < dataInRange.length; i++) {
    const prev = dataInRange[i - 1];
    const curr = dataInRange[i];
    TestValidator.predicate(
      "results should be sorted ascending by createdAt",
      prev.createdAt.localeCompare(curr.createdAt) <= 0,
    );
  }
}
