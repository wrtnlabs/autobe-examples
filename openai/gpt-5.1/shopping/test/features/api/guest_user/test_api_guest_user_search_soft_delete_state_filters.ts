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
 * Validate guest user search soft-delete state filters.
 *
 * ## Business goal
 *
 * Ensure that the administrative guest user search endpoint (PATCH
 * /shoppingMall/platformAdmin/guestUsers) honors the soft-deletion-related
 * filters:
 *
 * - `is_deleted`: boolean flag choosing active vs soft-deleted rows.
 * - `deleted_from` / `deleted_to`: inclusive deleted_at window for soft-deleted
 *   rows.
 *
 * Because there is no public delete API in the available SDK surface, we cannot
 * actively toggle deleted_at from the test. Instead, we validate the following
 * realistic invariant:
 *
 * - Newly created guest users are active (deleted_at is null).
 * - Searching with `is_deleted: false` can retrieve those records.
 * - Searching the same cohort with `is_deleted: true` and a deleted_at window
 *   returns an empty page.
 *
 * This still validates that the soft-delete related filters behave consistently
 * from the platform admin perspective.
 *
 * ## High level steps
 *
 * 1. Join as platform admin via POST /auth/platformAdmin/join to obtain an
 *    authorized admin session.
 * 2. Create several guest users via POST /shoppingMall/platformAdmin/guestUsers.
 * 3. Verify that all created guests have `deleted_at === null`.
 * 4. Search guest users with `is_deleted: false` and a filter that targets one of
 *    the created guests (via temporary_identifier). Assert that:
 *
 *    - The result page is non-empty.
 *    - The targeted guest id appears in `data`.
 * 5. Search guest users with `is_deleted: true` and a deleted_at window, using the
 *    same filter by temporary_identifier. Assert that:
 *
 *    - Pagination.records === 0.
 *    - Data.length === 0.
 *
 * This workflow proves that the endpoint distinguishes between active and
 * soft-deleted guests and that the deleted_at window does not mistakenly
 * include active records.
 */
export async function test_api_guest_user_search_soft_delete_state_filters(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to gain authorization context
  const joinRequest = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Create a small cohort of guest users under platform admin context
  const guestCount = 5;
  const createdGuests: IShoppingMallGuestUser[] = [];

  const sharedTemporaryId = `guest-${RandomGenerator.alphaNumeric(12)}`;

  for (let i = 0; i < guestCount; i++) {
    const createBody = {
      temporary_identifier: sharedTemporaryId,
      user_agent: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 8,
      }),
    } satisfies IShoppingMallGuestUser.ICreate;

    const guest =
      await api.functional.shoppingMall.platformAdmin.guestUsers.create(
        connection,
        { body: createBody },
      );
    typia.assert(guest);

    createdGuests.push(guest);
  }

  // 3. Validate that all created guests are active (deleted_at is null or undefined)
  await TestValidator.predicate(
    "all created guests are active (not soft-deleted)",
    async () => {
      for (const guest of createdGuests) {
        if (guest.deleted_at !== null && guest.deleted_at !== undefined)
          return false;
      }
      return true;
    },
  );

  // Helper: pick a reference guest id for later matching
  const targetGuest = createdGuests[0];

  // 4. Search with is_deleted: false, filtered by temporary_identifier
  const activeSearchBody = {
    page: 1,
    limit: 20,
    temporary_identifier: sharedTemporaryId,
    is_deleted: false,
    order_by: "created_at",
    order_direction: "desc" as const,
  } satisfies IShoppingMallGuestUser.IRequest;

  const activePage: IPageIShoppingMallGuestuser.ISummary =
    await api.functional.shoppingMall.platformAdmin.guestUsers.index(
      connection,
      {
        body: activeSearchBody,
      },
    );
  typia.assert(activePage);

  // Ensure we got at least one result
  TestValidator.predicate(
    "active search returns at least one guest for shared temporary_identifier",
    activePage.data.length > 0,
  );

  // Ensure one of the results matches targetGuest.id
  const foundSummary = activePage.data.find(
    (summary) => summary.id === targetGuest.id,
  );

  TestValidator.predicate(
    "target guest appears in active (is_deleted=false) search results",
    foundSummary !== undefined,
  );

  // 5. Search with is_deleted: true and a deleted_at window for the same temporary_identifier
  const now = new Date();
  const windowStart = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // 1 hour ago
  const windowEnd = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour ahead

  const deletedSearchBody = {
    page: 1,
    limit: 20,
    temporary_identifier: sharedTemporaryId,
    is_deleted: true,
    deleted_from: windowStart,
    deleted_to: windowEnd,
    order_by: "deleted_at",
    order_direction: "desc" as const,
  } satisfies IShoppingMallGuestUser.IRequest;

  const deletedPage: IPageIShoppingMallGuestuser.ISummary =
    await api.functional.shoppingMall.platformAdmin.guestUsers.index(
      connection,
      {
        body: deletedSearchBody,
      },
    );
  typia.assert(deletedPage);

  // Expect no soft-deleted records for this temporary_identifier
  TestValidator.equals(
    "soft-deleted search with matching window returns no records for active-only cohort",
    deletedPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "soft-deleted search with matching window returns empty data array",
    deletedPage.data.length,
    0,
  );
}
