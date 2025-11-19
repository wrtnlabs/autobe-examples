import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";

/**
 * Validate that the admin account listing endpoint returns correct default
 * paginated summaries to authenticated admins, with no filters or sorting
 * applied and no soft-deleted accounts present in the basic listing.
 *
 * This test covers:
 *
 * - Registering and authenticating as two admin accounts
 * - Verifying that authorized admin can access listing endpoint
 * - Requesting the listing with an empty/default filter object
 * - Validating presence, format, and required fields of returned admin summary
 *   data
 * - Ensuring soft-deleted accounts are not present in default results
 * - Checking default pagination structure
 */
export async function test_api_admin_account_listing_basic_search(
  connection: api.IConnection,
) {
  // Register and authenticate as first admin
  const admin1_email = typia.random<string & tags.Format<"email">>();
  const admin1_password = RandomGenerator.alphaNumeric(12);
  const admin1_body = {
    email: admin1_email,
    password: admin1_password satisfies string,
    href: "https://admin-panel.example.com/register",
    referrer: "https://main.example.com/landing",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin1 = await api.functional.auth.admin.join(connection, {
    body: admin1_body,
  });
  typia.assert(admin1);
  TestValidator.equals("admin1 email is correct", admin1.email, admin1_email);

  // Register and authenticate as second admin
  const admin2_email = typia.random<string & tags.Format<"email">>();
  const admin2_password = RandomGenerator.alphaNumeric(12);
  const admin2_body = {
    email: admin2_email,
    password: admin2_password satisfies string,
    href: "https://admin-panel.example.com/register",
    referrer: "https://main.example.com/landing",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin2 = await api.functional.auth.admin.join(connection, {
    body: admin2_body,
  });
  typia.assert(admin2);
  TestValidator.equals("admin2 email is correct", admin2.email, admin2_email);

  // Now authenticated as admin2 (last join sets current authorization)
  // Request admin account listing with defaults (no filters/pagination fields)
  const response = await api.functional.discussionBoard.admin.admins.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.predicate(
    "pagination structure is valid",
    !!response.pagination && typeof response.pagination.current === "number",
  );
  TestValidator.predicate(
    "admin data array is present",
    Array.isArray(response.data),
  );
  // Should contain at least the two admins just registered
  const emails_in_list = response.data.map((a) => a.email);
  TestValidator.predicate(
    "admin1 is in listing",
    emails_in_list.includes(admin1_email),
  );
  TestValidator.predicate(
    "admin2 is in listing",
    emails_in_list.includes(admin2_email),
  );
  // All listed admins: deleted_at either null, undefined, or not present
  for (const summary of response.data) {
    TestValidator.equals(
      "deleted_at is unset in default listing",
      summary.deleted_at,
      null,
    );
    // Validate summary structure (typia.assert already checked full type)
    TestValidator.predicate("summary has id", typeof summary.id === "string");
    TestValidator.predicate(
      "summary has email",
      typeof summary.email === "string",
    );
    TestValidator.predicate(
      "summary has created_at",
      typeof summary.created_at === "string",
    );
    TestValidator.predicate(
      "summary has updated_at",
      typeof summary.updated_at === "string",
    );
  }
}
