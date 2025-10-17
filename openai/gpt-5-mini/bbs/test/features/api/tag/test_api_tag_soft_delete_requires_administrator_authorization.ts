import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

/**
 * Ensure that tag soft-deletion endpoint is restricted to administrators.
 *
 * Business intent:
 *
 * - Anonymous callers must be rejected with 401 Unauthorized.
 * - Authenticated regular registered users must be rejected with 403 Forbidden.
 * - Administrators should be able to reach the endpoint; as a positive control,
 *   deleting a non-existent tag should return 404 Not Found.
 *
 * Workflow:
 *
 * 1. Attempt DELETE as anonymous (no Authorization) -> expect 401.
 * 2. Create a registered user (uses POST /auth/registeredUser/join).
 * 3. Attempt DELETE as the registered user -> expect 403.
 * 4. Create an administrator (uses POST /auth/administrator/join) to switch
 *    authorization to admin token.
 * 5. Attempt DELETE on a random/non-existent tag id as admin -> expect 404.
 */
export async function test_api_tag_soft_delete_requires_administrator_authorization(
  connection: api.IConnection,
) {
  // 1) Build an unauthenticated connection (SDK rule: allowed to create empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Attempt deletion without any auth -> should be 401 Unauthorized
  await TestValidator.httpError(
    "anonymous cannot delete tag",
    401,
    async () => {
      await api.functional.econPoliticalForum.administrator.tags.erase(
        unauthConn,
        {
          tagId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 2) Create a normal registered user (this call sets connection.headers.Authorization)
  const registeredUserBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const registered: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: registeredUserBody,
    });
  typia.assert(registered);

  // 3) Attempt deletion as normal registered user -> should be 403 Forbidden
  await TestValidator.httpError(
    "registered user cannot delete tag",
    403,
    async () => {
      await api.functional.econPoliticalForum.administrator.tags.erase(
        connection,
        {
          tagId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 4) Create an administrator account (this will set admin token on connection)
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(6),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // 5) Admin attempts to delete a non-existent/random tag -> expect 404 Not Found
  await TestValidator.httpError(
    "admin deleting non-existent tag returns 404",
    404,
    async () => {
      await api.functional.econPoliticalForum.administrator.tags.erase(
        connection,
        {
          tagId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
