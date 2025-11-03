import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";

/**
 * Validate moderator guest listing with search, date range, and pagination.
 *
 * Business context:
 *
 * - Moderators may search for guest-attributed records. This test ensures that a
 *   newly created moderator can authenticate and call the protected listing
 *   endpoint, that the endpoint accepts common filters (displayName partial
 *   match and createdAt range), and that it returns a properly structured
 *   paginated summary (pagination metadata + guest summaries).
 *
 * Steps:
 *
 * 1. Create a moderator account via POST /auth/moderator/join
 * 2. With the authenticated connection (SDK sets Authorization), call PATCH
 *    /discussionBoard/moderator/guests with a search request that includes
 *    displayName, createdAtFrom/To, includeDeleted=false, page and limit, and
 *    sort.
 * 3. Assert response types and business invariants: pagination exists and reflects
 *    requested page/limit; each returned guest summary has id and created_at
 *    and, when display_name is present, it matches the search term
 *    (case-insensitive). Note: IDiscussionBoardGuest.ISummary does NOT expose
 *    deleted_at; therefore this test cannot directly assert exclusion of
 *    soft-deleted records and omits that check.
 */
export async function test_api_guest_listing_by_moderator(
  connection: api.IConnection,
) {
  // 1) Create a moderator account (authentication step). The SDK will
  //    automatically set Authorization header in connection upon success.
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(10);
  const moderatorDisplay = RandomGenerator.name();

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        // Ensure password meets policy: min 12 chars and mix of classes
        password: "A_str0ngP@ssw0rd",
        display_name: moderatorDisplay,
        href: "https://example.test/session",
        referrer: "https://example.test/referrer",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  typia.assert(moderator.token);

  // 2) Prepare search parameters. Use a substring of display name to increase
  //    likelihood of matching in simulated environments.
  const searchTerm = RandomGenerator.substring(moderatorDisplay || "");

  // createdAt range: last 30 days to now
  const createdAtFrom = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const createdAtTo = new Date().toISOString();

  const page = 1;
  const limit = 20;

  // 3) Call the guest listing endpoint with filters and pagination
  const pageResult: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        displayName: searchTerm || undefined,
        createdAtFrom,
        createdAtTo,
        includeDeleted: false,
        page,
        limit,
        sort: "-createdAt",
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(pageResult);

  // 4) Validate pagination metadata
  TestValidator.predicate(
    "pagination object present",
    pageResult.pagination !== null && pageResult.pagination !== undefined,
  );
  typia.assert<IPage.IPagination>(pageResult.pagination);

  TestValidator.equals(
    "returned current page equals requested page",
    pageResult.pagination.current,
    page,
  );
  TestValidator.equals(
    "returned limit equals requested limit",
    pageResult.pagination.limit,
    limit,
  );

  // 5) Validate each guest summary
  for (const guest of pageResult.data) {
    typia.assert<IDiscussionBoardGuest.ISummary>(guest);

    // id should be present (UUID string)
    TestValidator.predicate(
      "guest id is present",
      typeof guest.id === "string" && guest.id.length > 0,
    );

    // created_at should be present and within the requested range
    TestValidator.predicate(
      "guest created_at is present",
      typeof guest.created_at === "string" && guest.created_at.length > 0,
    );

    // If display_name is present, it should include the search term (case-insensitive)
    if (guest.display_name !== null && guest.display_name !== undefined) {
      const hasMatch = searchTerm
        ? guest.display_name.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      TestValidator.predicate(
        "guest display_name matches search term",
        hasMatch,
      );
    }

    // Optionally check updated_at presence
    TestValidator.predicate(
      "guest updated_at is present",
      typeof guest.updated_at === "string" && guest.updated_at.length > 0,
    );

    // Check created_at falls within the requested interval when parseable
    try {
      const created = new Date(guest.created_at).toISOString();
      TestValidator.predicate(
        "created_at within requested range",
        created >= createdAtFrom && created <= createdAtTo,
      );
    } catch {
      // If parsing fails, let typia.assert have already validated the string format
    }
  }
}
