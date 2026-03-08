import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import type { IRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator search functionality with partial text matching on email and displayName fields.
 *
 * This test validates:
 * 1. 'search' parameter - case-insensitive partial match across both email OR displayName
 * 2. 'email' parameter - case-insensitive partial email matching
 * 3. 'displayName' parameter - fuzzy matching for display names
 */
export async function test_api_administrator_search_by_email_and_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create multiple administrators with distinct email patterns and display names
  const adminConnections: api.IConnection[] = [];
  const admins: IDiscussionBoardAdmin.IAuthorized[] = [];
  // Create first admin with specific email pattern
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: "john.smith.test@example.com",
      password: "SecurePass123!",
      display_name: "John Smith",
    },
  });
  typia.assert(admin1);
  admins.push(admin1);
  adminConnections.push(admin1Connection);
  // Create second admin with different email pattern
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: "jane.doe.test@example.org",
      password: "SecurePass456!",
      display_name: "Jane Doe",
    },
  });
  typia.assert(admin2);
  admins.push(admin2);
  adminConnections.push(admin2Connection);
  // Create third admin with similar name pattern
  const admin3Connection: api.IConnection = { host: connection.host };
  const admin3 = await authorize_admin_join(admin3Connection, {
    body: {
      email: "john.doe.admin@example.net",
      password: "SecurePass789!",
      display_name: "Johnny Doe",
    },
  });
  typia.assert(admin3);
  admins.push(admin3);
  adminConnections.push(admin3Connection);
  // 2. Promote admin1 to super grade for search privileges
  await api.functional.discussionBoard.admin.admins.promote(admin1Connection, {
    adminId: admin1.id,
    body: {
      reason: "For testing search functionality",
    } satisfies IDiscussionBoardAdmin.IPromote,
  });
  // 3. Test 'search' parameter - general text search across email AND displayName (OR logic)
  // Search for "john" - should match both admin1 (email: john.smith.test) and admin3 (displayName: Johnny Doe, email: john.doe.admin)
  const searchResultsJohn =
    await api.functional.discussionBoard.admin.admins.index(admin1Connection, {
      body: { search: "john" } satisfies IDiscussionBoardAdmin.IRequest,
    });
  typia.assert(searchResultsJohn);
  TestValidator.predicate(
    "search 'john' returns results",
    searchResultsJohn.data.length >= 2,
  );
  TestValidator.predicate(
    "search results contain john in email or displayName",
    searchResultsJohn.data.every(
      (admin) =>
        admin.email.toLowerCase().includes("john") ||
        admin.displayName.toLowerCase().includes("john"),
    ),
  );
  // Test case-insensitive search
  const searchResultsUpperCase =
    await api.functional.discussionBoard.admin.admins.index(admin1Connection, {
      body: { search: "JOHN" } satisfies IDiscussionBoardAdmin.IRequest,
    });
  typia.assert(searchResultsUpperCase);
  TestValidator.equals(
    "case-insensitive search matches same results",
    searchResultsJohn.data.length,
    searchResultsUpperCase.data.length,
  );
  // 4. Test 'email' parameter - partial email matching
  const emailResults = await api.functional.discussionBoard.admin.admins.index(
    admin1Connection,
    {
      body: { email: "example.com" } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(emailResults);
  TestValidator.predicate(
    "email search 'example.com' returns results",
    emailResults.data.length >= 1,
  );
  TestValidator.predicate(
    "email results all contain search term",
    emailResults.data.every((admin) =>
      admin.email.toLowerCase().includes("example.com"),
    ),
  );
  // Test partial email search with specific pattern
  const emailPartialResults =
    await api.functional.discussionBoard.admin.admins.index(admin1Connection, {
      body: { email: "jane.doe" } satisfies IDiscussionBoardAdmin.IRequest,
    });
  typia.assert(emailPartialResults);
  TestValidator.predicate(
    "email partial search finds jane.doe",
    emailPartialResults.data.some((admin) => admin.email.includes("jane.doe")),
  );
  // 5. Test 'displayName' parameter - fuzzy matching
  const displayNameResults =
    await api.functional.discussionBoard.admin.admins.index(admin1Connection, {
      body: { displayName: "Smith" } satisfies IDiscussionBoardAdmin.IRequest,
    });
  typia.assert(displayNameResults);
  TestValidator.predicate(
    "displayName search 'Smith' returns results",
    displayNameResults.data.length >= 1,
  );
  // Test partial displayName search
  const displayNamePartialResults =
    await api.functional.discussionBoard.admin.admins.index(admin1Connection, {
      body: { displayName: "Doe" } satisfies IDiscussionBoardAdmin.IRequest,
    });
  typia.assert(displayNamePartialResults);
  TestValidator.predicate(
    "displayName partial search finds Doe",
    displayNamePartialResults.data.length >= 2,
  );
  // 6. Test combined search behavior - search should be OR across email and displayName
  // Search for "smith" should find admin1 via displayName "John Smith"
  const searchSmithResults =
    await api.functional.discussionBoard.admin.admins.index(admin1Connection, {
      body: { search: "smith" } satisfies IDiscussionBoardAdmin.IRequest,
    });
  typia.assert(searchSmithResults);
  TestValidator.predicate(
    "search 'smith' finds results",
    searchSmithResults.data.length >= 1,
  );
  // 7. Test pagination with search
  const paginatedResults =
    await api.functional.discussionBoard.admin.admins.index(admin1Connection, {
      body: {
        search: "john",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardAdmin.IRequest,
    });
  typia.assert(paginatedResults);
  TestValidator.predicate(
    "paginated search returns valid pagination",
    paginatedResults.pagination.current === 1,
  );
  TestValidator.predicate(
    "paginated search respects limit",
    paginatedResults.data.length <= 10,
  );
}
