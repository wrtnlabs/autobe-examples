import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that retrieving a non-existent admin account returns 404 Not Found.
 *
 * This test validates that the admin retrieval endpoint properly handles
 * requests for administrator accounts that do not exist in the database,
 * returning an appropriate 404 HTTP error response.
 */
export async function test_api_admin_retrieve_nonexistent_admin_returns_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneAdmin.IJoin,
  });
  // 2. Generate a non-existent admin ID (valid UUID format but not in database)
  const nonExistentAdminId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent admin and verify 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent admin",
    404,
    async () =>
      await api.functional.redditClone.admin.admins.at(adminConnection, {
        adminId: nonExistentAdminId,
      }),
  );
}
