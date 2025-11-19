import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";

/**
 * Test filtering the admin account list by email after authenticating as an
 * admin.
 *
 * This test ensures correct functionality of the paginated admin account
 * search/filter endpoint, verifying that searching by an exact or partial email
 * match returns the correct administrator(s) and that non-matching accounts are
 * not included in results. It covers both positive and negative scenarios and
 * ensures search criteria are correctly enforced.
 *
 * Steps:
 *
 * 1. Register and authenticate a first admin account with a unique email (admin1)
 * 2. Register a second distinct admin account with a different unique email
 *    (admin2)
 * 3. As admin1, use the admin search API to filter with the exact email for admin1
 *
 *    - Validate only admin1 is returned
 * 4. As admin1, search by a substring (partial) present in both admin1 and admin2
 *    emails
 *
 *    - Validate both admins matching the partial substring are returned
 * 5. As admin1, search by a random email substring that matches no accounts
 *
 *    - Validate an empty result set is returned
 * 6. Ensure no irrelevant/different accounts are included in any search result
 */
export async function test_api_admin_account_search_by_email(
  connection: api.IConnection,
) {
  // 1. Register and authenticate the first admin account
  const admin1Email: string = typia.random<string & tags.Format<"email">>();
  const admin1Href: string = "https://example.com/admin/join1";
  const admin1Referrer: string = "https://example.com/start";
  const admin1Password: string = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();

  const admin1 = await api.functional.auth.admin.join(connection, {
    body: {
      email: admin1Email,
      password: admin1Password,
      href: admin1Href,
      referrer: admin1Referrer,
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin1);

  // 2. Register the second admin account
  const admin2Email: string = typia.random<string & tags.Format<"email">>();
  const admin2Href: string = "https://example.com/admin/join2";
  const admin2Referrer: string = "https://example.com/start";
  const admin2Password: string = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();

  // Switch context to a new unauthenticated connection for new account registration
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const admin2 = await api.functional.auth.admin.join(unauthConn, {
    body: {
      email: admin2Email,
      password: admin2Password,
      href: admin2Href,
      referrer: admin2Referrer,
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin2);

  // Switch back, RE-authenticate as the original admin1 account to ensure role context
  await api.functional.auth.admin.join(connection, {
    body: {
      email: admin1Email,
      password: admin1Password,
      href: admin1Href,
      referrer: admin1Referrer,
    } satisfies IDiscussionBoardAdmin.IJoin,
  });

  // 3. Search for admin1 by exact email
  const resExact = await api.functional.discussionBoard.admin.admins.index(
    connection,
    {
      body: {
        email: admin1Email,
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(resExact);
  TestValidator.equals(
    "search by exact email returns only admin1",
    resExact.data.length,
    1,
  );
  TestValidator.equals(
    "returned admin has the searched email",
    resExact.data[0].email,
    admin1Email,
  );

  // 4. Search by partial email substring
  // Use a substring of the admin email (at least the first part before @ or first 4 chars)
  const emailSubstring = admin1Email.split("@")[0].substring(0, 4);
  const resPartial = await api.functional.discussionBoard.admin.admins.index(
    connection,
    {
      body: {
        email: emailSubstring as string & tags.Format<"email">,
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(resPartial);
  TestValidator.predicate(
    "search by substring returns every admin with matching substring",
    resPartial.data.every((a) => a.email.includes(emailSubstring)),
  );
  // At least one matching (should include admin1), possibly also admin2 if substring overlaps
  TestValidator.predicate(
    "at least one matching admin in substring search",
    resPartial.data.length >= 1,
  );

  // 5. Search by a non-matching random substring
  const nonMatchSubstring = RandomGenerator.alphaNumeric(12);
  const resNone = await api.functional.discussionBoard.admin.admins.index(
    connection,
    {
      body: {
        email: nonMatchSubstring as string & tags.Format<"email">,
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(resNone);
  TestValidator.equals(
    "search with unmatched substring returns empty result",
    resNone.data.length,
    0,
  );

  // 6. Ensure no irrelevant accounts are present in any search result
  TestValidator.predicate(
    "all emails in partial search are either admin1 or admin2",
    resPartial.data.every(
      (a) => a.email === admin1Email || a.email === admin2Email,
    ),
  );
}
