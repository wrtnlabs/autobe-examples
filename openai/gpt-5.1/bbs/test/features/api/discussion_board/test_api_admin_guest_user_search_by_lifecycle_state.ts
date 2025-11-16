import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuestuser";

/**
 * Validate admin guest user search by lifecycle deletion state.
 *
 * Business goal:
 *
 * - Ensure an authenticated adminUser can call the guest user search endpoint
 *   with different deleted_at range filters, and that the API returns
 *   type-safe, paginated guest user summaries whose lifecycle-related
 *   timestamps behave consistently.
 *
 * High-level steps:
 *
 * 1. Register a new admin user via POST /auth/adminUser/join.
 * 2. With the authenticated admin connection, call PATCH
 *    /discussionBoard/adminUser/guestUsers twice: a. Once with deleted_from and
 *    deleted_to explicitly set to null to represent an "unconstrained" or
 *    "active/all" view. b. Once with deleted_from set to a far-past timestamp
 *    and deleted_to set to now, to represent an explicit range for logically
 *    deleted guests.
 * 3. For each search call, assert type correctness and basic pagination
 *    invariants, and perform lifecycle consistency checks on timestamps.
 *
 * Notes:
 *
 * - The test does not create or delete guest users directly because the provided
 *   API surface exposes only a search endpoint for guest users. It assumes that
 *   appropriate guest user fixtures already exist in the test environment.
 * - The test focuses on invariants that can be validated purely from the returned
 *   data: pagination structure, deleted_at range inclusion for non-null values,
 *   and created_at/updated_at ordering.
 */
export async function test_api_admin_guest_user_search_by_lifecycle_state(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin user
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(adminAuthorized);

  // 2. Prepare common pagination and ordering options
  const requestedPage = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const requestedLimit = 20 as number & tags.Type<"int32"> & tags.Minimum<1>;

  // 3. First search: deleted_from and deleted_to explicitly null
  const firstSearchBody = {
    page: requestedPage,
    limit: requestedLimit,
    order_by: "created_at" as const,
    order_direction: "asc" as const,
    created_from: null,
    created_to: null,
    updated_from: null,
    updated_to: null,
    deleted_from: null,
    deleted_to: null,
    anonymous_token: null,
  } satisfies IDiscussionBoardGuestUser.IRequest;

  const firstPage: IPageIDiscussionBoardGuestuser.ISummary =
    await api.functional.discussionBoard.adminUser.guestUsers.index(
      connection,
      {
        body: firstSearchBody,
      },
    );
  typia.assert<IPageIDiscussionBoardGuestuser.ISummary>(firstPage);

  // 3-1. Validate pagination metadata for the first search
  const firstPagination = firstPage.pagination;
  TestValidator.predicate(
    "first search: pagination current is non-negative",
    firstPagination.current >= 0,
  );
  TestValidator.predicate(
    "first search: pagination limit is positive",
    firstPagination.limit > 0,
  );
  TestValidator.predicate(
    "first search: records is not negative",
    firstPagination.records >= 0,
  );
  TestValidator.predicate(
    "first search: pages is not negative",
    firstPagination.pages >= 0,
  );
  TestValidator.predicate(
    "first search: data length does not exceed limit",
    firstPage.data.length <= firstPagination.limit,
  );
  TestValidator.predicate(
    "first search: records greater or equal to data length",
    firstPagination.records >= firstPage.data.length,
  );
  TestValidator.predicate(
    "first search: zero records imply zero pages and empty data",
    firstPagination.records === 0
      ? firstPagination.pages === 0 && firstPage.data.length === 0
      : true,
  );

  // 3-2. Lifecycle sanity checks on returned guest summaries (no strict
  // assumptions beyond type correctness here)
  for (const guest of firstPage.data) {
    // created_at and updated_at should be valid date-time strings; typia.assert
    // already guarantees the format, but we additionally check logical ordering
    const createdAt = new Date(guest.created_at).getTime();
    const updatedAt = new Date(guest.updated_at).getTime();
    TestValidator.predicate(
      "first search: updated_at is not earlier than created_at",
      !Number.isNaN(createdAt) &&
        !Number.isNaN(updatedAt) &&
        updatedAt >= createdAt,
    );
  }

  // 4. Second search: deleted_at range covering wide historical window
  const deletedFrom = new Date("2000-01-01T00:00:00.000Z").toISOString();
  const deletedTo = new Date().toISOString();

  const secondSearchBody = {
    page: requestedPage,
    limit: requestedLimit,
    order_by: "deleted_at" as const,
    order_direction: "asc" as const,
    created_from: null,
    created_to: null,
    updated_from: null,
    updated_to: null,
    deleted_from: deletedFrom,
    deleted_to: deletedTo,
    anonymous_token: null,
  } satisfies IDiscussionBoardGuestUser.IRequest;

  const secondPage: IPageIDiscussionBoardGuestuser.ISummary =
    await api.functional.discussionBoard.adminUser.guestUsers.index(
      connection,
      {
        body: secondSearchBody,
      },
    );
  typia.assert<IPageIDiscussionBoardGuestuser.ISummary>(secondPage);

  // 4-1. Validate pagination metadata for the second search
  const secondPagination = secondPage.pagination;
  TestValidator.predicate(
    "second search: pagination current is non-negative",
    secondPagination.current >= 0,
  );
  TestValidator.predicate(
    "second search: pagination limit is positive",
    secondPagination.limit > 0,
  );
  TestValidator.predicate(
    "second search: records is not negative",
    secondPagination.records >= 0,
  );
  TestValidator.predicate(
    "second search: pages is not negative",
    secondPagination.pages >= 0,
  );
  TestValidator.predicate(
    "second search: data length does not exceed limit",
    secondPage.data.length <= secondPagination.limit,
  );
  TestValidator.predicate(
    "second search: records greater or equal to data length",
    secondPagination.records >= secondPage.data.length,
  );
  TestValidator.predicate(
    "second search: zero records imply zero pages and empty data",
    secondPagination.records === 0
      ? secondPagination.pages === 0 && secondPage.data.length === 0
      : true,
  );

  // 4-2. For each guest with non-null deleted_at, ensure it lies within
  // [deletedFrom, deletedTo] and respect lifecycle ordering with created_at
  const deletedFromTime = new Date(deletedFrom).getTime();
  const deletedToTime = new Date(deletedTo).getTime();

  for (const guest of secondPage.data) {
    const createdAt = new Date(guest.created_at).getTime();
    const updatedAt = new Date(guest.updated_at).getTime();
    TestValidator.predicate(
      "second search: updated_at is not earlier than created_at",
      !Number.isNaN(createdAt) &&
        !Number.isNaN(updatedAt) &&
        updatedAt >= createdAt,
    );

    if (guest.deleted_at !== null && guest.deleted_at !== undefined) {
      const deletedAtTime = new Date(guest.deleted_at).getTime();
      TestValidator.predicate(
        "second search: deleted_at within requested range when non-null",
        !Number.isNaN(deletedAtTime) &&
          deletedAtTime >= deletedFromTime &&
          deletedAtTime <= deletedToTime,
      );
    }
  }
}
