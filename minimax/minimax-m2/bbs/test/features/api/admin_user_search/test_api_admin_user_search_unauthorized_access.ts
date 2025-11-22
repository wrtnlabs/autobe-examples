import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalDiscussionUser";

export async function test_api_admin_user_search_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Create a system administrator account (dependency requirement)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: adminEmail,
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(admin);

  // 2. Test unauthorized access - attempt without proper admin authentication
  // Create an unauthenticated connection (no authorization headers)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Test 1: Attempt to access user search without any authentication
  await TestValidator.httpError(
    "user search should reject unauthenticated requests with 401",
    401,
    async () => {
      await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
        unauthenticatedConnection,
        {
          body: {
            page: 1,
            limit: 20,
          } satisfies IEconPoliticalDiscussionUser.IRequest,
        },
      );
    },
  );

  // Test 2: Attempt with invalid authentication token
  const invalidConnection: api.IConnection = {
    ...connection,
    headers: {
      Authorization: "Bearer invalid_token_12345",
    },
  };

  await TestValidator.httpError(
    "user search should reject invalid tokens with 401",
    401,
    async () => {
      await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
        invalidConnection,
        {
          body: {
            page: 1,
            limit: 20,
            search: "test",
          } satisfies IEconPoliticalDiscussionUser.IRequest,
        },
      );
    },
  );

  // Test 3: Create a regular user account and test access
  const regularUserEmail = typia.random<string & tags.Format<"email">>();
  const regularUser = await api.functional.auth.systemAdministrator.join.create(
    unauthenticatedConnection,
    {
      body: {
        display_name: RandomGenerator.name(),
        email: regularUserEmail,
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    },
  );

  // The regular user join should work (it's a public endpoint)
  // Now test if this regular user can access admin functions
  const regularUserConnection: api.IConnection = {
    ...connection,
    headers: {
      Authorization: regularUser.token.access,
    },
  };

  await TestValidator.httpError(
    "user search should reject regular user access with 403",
    403,
    async () => {
      await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
        regularUserConnection,
        {
          body: {
            page: 1,
            limit: 20,
          } satisfies IEconPoliticalDiscussionUser.IRequest,
        },
      );
    },
  );

  // 3. Verify authorized access still works properly
  const authorizedUsers =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEconPoliticalDiscussionUser.IRequest,
      },
    );
  typia.assert(authorizedUsers);

  TestValidator.equals(
    "authorized admin access returns user list",
    authorizedUsers.data.length,
    2,
  );

  TestValidator.equals(
    "response contains pagination info",
    authorizedUsers.pagination.current,
    1,
  );

  // Test with search parameters
  const filteredUsers =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: admin.display_name,
        } satisfies IEconPoliticalDiscussionUser.IRequest,
      },
    );
  typia.assert(filteredUsers);

  TestValidator.predicate(
    "search results should be filtered correctly",
    filteredUsers.data.some((user) =>
      user.display_name.includes(admin.display_name),
    ),
  );
}
