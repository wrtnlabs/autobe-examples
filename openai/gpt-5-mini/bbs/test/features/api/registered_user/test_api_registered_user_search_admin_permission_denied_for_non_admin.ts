import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumRegisteredUser";

export async function test_api_registered_user_search_admin_permission_denied_for_non_admin(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Create a regular registered user account and obtain its auth token.
   * - Attempt to call the admin-only user search endpoint using the regular
   *   user's credentials and assert that access is denied (HTTP 403).
   *
   * Business rationale:
   *
   * - Verify RBAC enforcement so that non-admin accounts cannot query
   *   administrative user listings or access PII-sensitive administrative
   *   functionality.
   */

  // 1) Prepare and perform account registration (regular user)
  const joinBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const authorized: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  // Validate response type
  typia.assert(authorized);

  // NOTE: SDK's join() sets connection.headers.Authorization = output.token.access
  // so the connection now represents an authenticated, non-admin user.

  // 2) Build a minimal admin search request (valid DTO)
  const adminSearchRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IEconPoliticalForumRegisteredUser.IRequest;

  // 3) Assert that calling admin endpoint with non-admin credentials fails with 403
  await TestValidator.httpError(
    "non-admin cannot access admin user search",
    403,
    async () => {
      await api.functional.econPoliticalForum.administrator.users.index(
        connection,
        {
          body: adminSearchRequest,
        },
      );
    },
  );

  // End of test. No explicit teardown performed; test infra should reset DB between runs.
}
