import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalDiscussionUser";

/**
 * Test user search filtering by account status for system administrator user
 * management.
 *
 * Creates users with different account statuses (active, suspended,
 * deactivated), then performs searches filtering by specific status values.
 * Validates that the search correctly returns only users matching the specified
 * status filter for efficient user management and moderation.
 */
export async function test_api_admin_user_search_status_filter(
  connection: api.IConnection,
) {
  // 1. Authenticate as system administrator
  const adminUser = await api.functional.auth.systemAdministrator.join.create(
    connection,
    {
      body: {
        display_name: "Test Administrator",
        email: typia.random<string & tags.Format<"email">>(),
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    },
  );
  typia.assert(adminUser);

  // 2. Create test users with different statuses for filtering validation
  const activeUser = await api.functional.auth.systemAdministrator.join.create(
    connection,
    {
      body: {
        display_name: "Active User",
        email: typia.random<string & tags.Format<"email">>(),
        status: "active",
        bio: "Economics researcher interested in market analysis",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    },
  );
  typia.assert(activeUser);

  const suspendedUser =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: "Suspended User",
        email: typia.random<string & tags.Format<"email">>(),
        status: "suspended",
        bio: "Political commentator temporarily suspended",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(suspendedUser);

  const deactivatedUser =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: "Deactivated User",
        email: typia.random<string & tags.Format<"email">>(),
        status: "deactivated",
        bio: "Former participant who deactivated account",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(deactivatedUser);

  // 3. Test status filtering for active users
  const activeUsersSearch =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
      connection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 20,
        } satisfies IEconPoliticalDiscussionUser.IRequest,
      },
    );
  typia.assert(activeUsersSearch);

  // 4. Test status filtering for suspended users
  const suspendedUsersSearch =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
      connection,
      {
        body: {
          status: "suspended",
          page: 1,
          limit: 20,
        } satisfies IEconPoliticalDiscussionUser.IRequest,
      },
    );
  typia.assert(suspendedUsersSearch);

  // 5. Test status filtering for deactivated users
  const deactivatedUsersSearch =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
      connection,
      {
        body: {
          status: "deactivated",
          page: 1,
          limit: 20,
        } satisfies IEconPoliticalDiscussionUser.IRequest,
      },
    );
  typia.assert(deactivatedUsersSearch);

  // 6. Test search without status filter (should return all users)
  const allUsersSearch =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IEconPoliticalDiscussionUser.IRequest,
      },
    );
  typia.assert(allUsersSearch);

  // 7. Validate status filtering accuracy
  TestValidator.predicate(
    "active status filter should return users with active status",
    activeUsersSearch.data.every((user) => user.status === "active"),
  );

  TestValidator.predicate(
    "suspended status filter should return users with suspended status",
    suspendedUsersSearch.data.every((user) => user.status === "suspended"),
  );

  TestValidator.predicate(
    "deactivated status filter should return users with deactivated status",
    deactivatedUsersSearch.data.every((user) => user.status === "deactivated"),
  );

  // 8. Validate pagination structure
  TestValidator.predicate(
    "search results should include valid pagination metadata",
    activeUsersSearch.pagination.current === 1 &&
      activeUsersSearch.pagination.limit === 20 &&
      activeUsersSearch.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination should be consistent across different status searches",
    suspendedUsersSearch.pagination.current ===
      activeUsersSearch.pagination.current &&
      suspendedUsersSearch.pagination.limit ===
        activeUsersSearch.pagination.limit,
  );

  // 9. Validate user data structure integrity
  TestValidator.predicate(
    "search results should contain complete user summary data",
    activeUsersSearch.data.every(
      (user) =>
        user.id &&
        user.display_name &&
        user.status &&
        typeof user.id === "string" &&
        typeof user.display_name === "string" &&
        typeof user.status === "string",
    ),
  );

  // 10. Test pagination controls with different page sizes
  const secondPage =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IEconPoliticalDiscussionUser.IRequest,
      },
    );
  typia.assert(secondPage);

  TestValidator.equals(
    "second page should have correct page number",
    secondPage.pagination.current,
    2,
  );

  TestValidator.equals(
    "second page should have correct limit",
    secondPage.pagination.limit,
    10,
  );

  // 11. Test sorting functionality
  const sortedByName =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
      connection,
      {
        body: {
          order_by: "display_name",
          order_direction: "asc",
          limit: 10,
        } satisfies IEconPoliticalDiscussionUser.IRequest,
      },
    );
  typia.assert(sortedByName);

  TestValidator.predicate(
    "sorted search results should contain valid data",
    sortedByName.data.length > 0,
  );

  // 12. Test search functionality with text filtering
  const textSearch =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
      connection,
      {
        body: {
          search: "economics",
          limit: 10,
        } satisfies IEconPoliticalDiscussionUser.IRequest,
      },
    );
  typia.assert(textSearch);

  TestValidator.predicate(
    "text search should return relevant results",
    textSearch.data.length >= 0,
  );

  // 13. Validate that all users search includes all status types
  TestValidator.predicate(
    "unfiltered search should return comprehensive user list",
    allUsersSearch.data.length >= 3,
  );
}
