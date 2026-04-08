import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackGuest";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test searching guest invitations by email address with various search patterns.
 *
 * Validates the guest invitation search functionality by testing partial email matching, domain filtering, and empty search behavior. Ensures that the search parameter correctly filters invitations based on case-insensitive partial email matches.
 *
 * Special attention is given to verifying that partial name searches match emails containing the search term anywhere, domain searches match emails ending with the specified domain, and empty searches return all invitations without filtering.
 *
 * 1. Search for guest invitations with email containing "john" (partial name match).
 * 2. Verify all returned invitations have email addresses containing "john" (case-insensitive).
 * 3. Search for guest invitations with domain "@example.com".
 * 4. Verify all returned invitations have email addresses ending with "@example.com".
 * 5. Search with empty string to retrieve all invitations.
 * 6. Verify search functionality works without authentication.
 */
export async function test_api_guest_search_by_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Search for emails containing "john"
  const searchJohnBody = {
    search: "john",
  } satisfies IHrmTimeTrackGuest.IRequest;
  const searchJohnResult = await api.functional.hrmTimeTrack.guests.index(
    connection,
    { body: searchJohnBody },
  );
  typia.assert(searchJohnResult);
  // Verify all returned invitations contain "john" in email (case-insensitive)
  await ArrayUtil.asyncForEach(searchJohnResult.data, async (guest) => {
    TestValidator.predicate(
      `email contains "john" (case-insensitive)`,
      guest.email.toLowerCase().includes("john"),
    );
  });
  // 2. Search for emails with domain "@example.com"
  const searchDomainBody = {
    search: "@example.com",
  } satisfies IHrmTimeTrackGuest.IRequest;
  const searchDomainResult = await api.functional.hrmTimeTrack.guests.index(
    connection,
    { body: searchDomainBody },
  );
  typia.assert(searchDomainResult);
  // Verify all returned invitations end with "@example.com"
  await ArrayUtil.asyncForEach(searchDomainResult.data, async (guest) => {
    TestValidator.predicate(
      `email ends with "@example.com"`,
      guest.email.toLowerCase().endsWith("@example.com"),
    );
  });
  // 3. Search with empty string (should return all invitations)
  const searchAllBody = {
    search: "",
  } satisfies IHrmTimeTrackGuest.IRequest;
  const searchAllResult = await api.functional.hrmTimeTrack.guests.index(
    connection,
    { body: searchAllBody },
  );
  typia.assert(searchAllResult);
  // Verify pagination data is valid
  TestValidator.predicate(
    "pagination current page is valid",
    searchAllResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    searchAllResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    searchAllResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    searchAllResult.pagination.pages >= 0,
  );
  // Verify each guest in the result has required fields
  await ArrayUtil.asyncForEach(searchAllResult.data, async (guest) => {
    TestValidator.predicate(
      "guest has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        guest.id,
      ),
    );
    TestValidator.predicate(
      "guest has non-empty email",
      guest.email.length > 0,
    );
    TestValidator.predicate(
      "guest has valid status",
      ["pending", "accepted", "expired"].includes(guest.status),
    );
    TestValidator.predicate(
      "guest has valid expires_at",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
        guest.expires_at,
      ),
    );
    TestValidator.predicate(
      "guest has valid created_at",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
        guest.created_at,
      ),
    );
    TestValidator.predicate(
      "guest has organization with valid ID",
      guest.organization.id.length > 0,
    );
    TestValidator.predicate(
      "guest has role with valid ID",
      guest.role.id.length > 0,
    );
  });
}
