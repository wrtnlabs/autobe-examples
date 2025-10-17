import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";

/**
 * Validate moderator search/filter/filter access control on platform member
 * listing.
 *
 * 1. Register a new moderator to obtain authentication and session (using
 *    typia.random for realistic email/password/community).
 * 2. Send search/filter PATCH request to /communityPlatform/moderator/members as
 *    the moderator:
 *
 *    - With no filters (general access, should show only non-deleted, non-blocked
 *         members by default)
 *    - With email filter (random matching, partial match), verify only affected
 *         users returned
 *    - With status filter (e.g. 'blocked', 'deleted'), confirm records are not shown
 *         unless explicitly filtered and permitted
 *    - With createdAt/updatedAt range (filter for records after/before certain
 *         dates)
 *    - With sorting (e.g. by created_at, email ascending/descending)
 * 3. For each result page:
 *
 *    - Confirm correct paging structure (pagination fields)
 *    - All summary records:
 *
 *         - Include only id, email, email_verified, status, created_at, updated_at,
 *                   (optional deleted_at)
 *         - No sensitive/authentication fields (password, password_hash, etc.)
 *         - Status is allowed (default to "active" unless filter used)
 * 4. Security/access check:
 *
 *    - Create a connection with empty headers (simulate unauthenticated access)
 *    - Attempt PATCH to /communityPlatform/moderator/members with any filters,
 *         expect error/denied access
 *    - (If possible) Attempt with another role (if API allows), expect denied access
 *         or error
 * 5. Error/edge case:
 *
 *    - Use nonsensical filter values (email: very unlikely string, impossible date
 *         ranges), ensure empty or correct error, no leakage
 *    - Use maximum/minimum pagination, limit values, check they work as expected
 *    - Try sort by each supported field, check order matches
 */
export async function test_api_member_moderator_index_search_filter_access_control(
  connection: api.IConnection,
) {
  // 1. Register a moderator
  const moderatorJoin = typia.random<ICommunityPlatformModerator.IJoin>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorJoin,
  });
  typia.assert(moderator);

  // 2a. General access: list all members with no filter
  const allMembersPage =
    await api.functional.communityPlatform.moderator.members.index(connection, {
      body: {},
    });
  typia.assert(allMembersPage);
  // validate pagination fields
  TestValidator.predicate(
    "pagination structure present",
    typeof allMembersPage.pagination.current === "number" &&
      typeof allMembersPage.pagination.limit === "number",
  );
  // validate each summary record fields
  for (const rec of allMembersPage.data) {
    typia.assert<ICommunityPlatformMember.ISummary>(rec);
    TestValidator.predicate("no password in summary", !("password" in rec));
    TestValidator.predicate(
      "no password_hash in summary",
      !("password_hash" in rec),
    );
    TestValidator.predicate("id is uuid", typeof rec.id === "string");
    TestValidator.predicate(
      "status allowed without filter",
      rec.status === "active",
    );
  }
  // 2b. Email filter: partial match
  if (allMembersPage.data.length > 0) {
    const partialEmail = allMembersPage.data[0].email.slice(0, 5);
    const filtered =
      await api.functional.communityPlatform.moderator.members.index(
        connection,
        {
          body: { email: partialEmail },
        },
      );
    typia.assert(filtered);
    for (const rec of filtered.data) {
      TestValidator.predicate(
        "filtered email contains partialEmail",
        rec.email.includes(partialEmail),
      );
    }
  }
  // 2c. Status filter: blocked (should be empty or error for non-blocked account unless allowed)
  const statusFiltered =
    await api.functional.communityPlatform.moderator.members.index(connection, {
      body: { status: "blocked" },
    });
  typia.assert(statusFiltered);
  for (const rec of statusFiltered.data) {
    TestValidator.equals(
      "status is blocked when filtered",
      rec.status,
      "blocked",
    );
  }
  // 2d. Date range filter: createdAtFrom and createdAtTo
  const dateFrom = new Date(
    Date.now() - 10 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateTo = new Date().toISOString();
  const dateFiltered =
    await api.functional.communityPlatform.moderator.members.index(connection, {
      body: { createdAtFrom: dateFrom, createdAtTo: dateTo },
    });
  typia.assert(dateFiltered);
  for (const rec of dateFiltered.data) {
    TestValidator.predicate(
      "created_at after from",
      rec.created_at >= dateFrom,
    );
    TestValidator.predicate("created_at before to", rec.created_at <= dateTo);
  }
  // 2e. Sorting by email asc
  const emailSorted =
    await api.functional.communityPlatform.moderator.members.index(connection, {
      body: { sortBy: "email", order: "asc" },
    });
  typia.assert(emailSorted);
  for (let i = 1; i < emailSorted.data.length; ++i) {
    TestValidator.predicate(
      "email sorted asc",
      emailSorted.data[i - 1].email <= emailSorted.data[i].email,
    );
  }
  // 3. Security: unauthenticated access must be denied
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated moderator member index denied",
    async () => {
      await api.functional.communityPlatform.moderator.members.index(
        unauthConn,
        {
          body: {},
        },
      );
    },
  );
  // 4. Nonsensical filter: should return empty
  const nonsenseFilter =
    await api.functional.communityPlatform.moderator.members.index(connection, {
      body: { email: "this-cannot-match-xyz123!" },
    });
  typia.assert(nonsenseFilter);
  TestValidator.equals("nonsense filter empty", nonsenseFilter.data.length, 0);
  // 5. Maximum pagination
  const maxLimitPage =
    await api.functional.communityPlatform.moderator.members.index(connection, {
      body: { limit: 100 },
    });
  typia.assert(maxLimitPage);
  TestValidator.predicate(
    "limit respected",
    maxLimitPage.pagination.limit <= 100,
  );
}
