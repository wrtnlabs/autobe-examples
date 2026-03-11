import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful administrator login with valid credentials.
 *
 * This test verifies that when an admin with active status submits correct
 * email and password, the system authenticates successfully and returns JWT
 * access and refresh tokens along with admin profile information.
 *
 * Test flow:
 * 1. Create administrator account using authorize_admin_join
 * 2. Login using authorize_admin_login with the same credentials
 * 3. Validate response structure and token information
 * 4. Verify admin profile details including grade and member status
 */
export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare admin credentials for testing
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  // 2. Create administrator account for login testing
  const adminJoinResult = await authorize_admin_join(connection, {
    body: adminCredentials,
  });
  typia.assert(adminJoinResult);
  // 3. Login with the created admin credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(loginResult);
  // 4. Validate token structure
  TestValidator.predicate(
    "has access token",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expiration timestamp",
    loginResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has refreshable until timestamp",
    loginResult.token.refreshable_until.length > 0,
  );
  // 5. Validate admin profile
  TestValidator.predicate("admin id exists", loginResult.id.length > 0);
  TestValidator.predicate(
    "admin grade is valid",
    ["regular", "super"].includes(loginResult.grade),
  );
  TestValidator.predicate("admin is active", loginResult.deleted_at === null);
  // 6. Validate member summary
  TestValidator.predicate("member id exists", loginResult.member.id.length > 0);
  TestValidator.predicate(
    "member has display name",
    loginResult.member.display_name.length > 0,
  );
  TestValidator.predicate(
    "member status is active",
    loginResult.member.status === "active",
  );
  TestValidator.predicate(
    "member is admin",
    loginResult.member.is_admin === true,
  );
  // 7. Validate timestamps
  TestValidator.predicate(
    "created_at exists",
    loginResult.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    loginResult.updated_at.length > 0,
  );
}
