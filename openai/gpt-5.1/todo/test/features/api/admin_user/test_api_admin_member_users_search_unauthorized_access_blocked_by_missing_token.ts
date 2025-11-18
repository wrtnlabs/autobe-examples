import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberUser";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";

/**
 * Verify that the admin-only member user search endpoint cannot be accessed
 * when no Authorization token is present on the connection.
 *
 * Business context:
 *
 * - /todoApp/adminUser/memberUsers exposes paginated views of sensitive member
 *   user accounts (ITodoAppMemberUser.ISummary records wrapped in
 *   IPageITodoAppMemberUser.ISummary).
 * - According to the requirements, this endpoint is intended for the `adminUser`
 *   actor only, and must not be callable with a missing or invalid token.
 *
 * Test objective:
 *
 * - Ensure that when the PATCH /todoApp/adminUser/memberUsers endpoint is called
 *   without any Authorization header, the SDK throws an error and no member
 *   user data is returned.
 * - We do NOT validate HTTP status code or error body structure; we only assert
 *   that an error occurs, in line with global E2E rules.
 *
 * Steps:
 *
 * 1. Prepare a minimal, valid ITodoAppMemberUser.IRequest body using page=1 and
 *    limit=10 so that the backend validation would pass if authorization were
 *    present.
 * 2. Construct an unauthenticated connection by shallow-copying the provided
 *    `connection` and replacing its headers with an empty object, thereby
 *    removing any Authorization token that may have been set by previous
 *    tests.
 * 3. Call api.functional.todoApp.adminUser.memberUsers.index with this
 *    unauthenticated connection and the valid request body inside an async
 *    closure passed to TestValidator.error.
 * 4. Await TestValidator.error with a descriptive title, asserting that the call
 *    results in an error (authentication failure) rather than a successful page
 *    of member users.
 */
export async function test_api_admin_member_users_search_unauthorized_access_blocked_by_missing_token(
  connection: api.IConnection,
) {
  // 1. Prepare minimal, valid search request body
  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies ITodoAppMemberUser.IRequest;

  // 2. Create an unauthenticated connection (no Authorization header)
  //    We must not mutate the original connection.headers directly.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3 & 4. Attempt to call the admin-only search endpoint without token
  //        and assert that it fails.
  await TestValidator.error(
    "member user search must fail without admin Authorization token",
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.index(
        unauthenticatedConnection,
        {
          body: requestBody,
        },
      );
    },
  );
}
