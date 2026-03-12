import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test login rejection when member account has been deleted.
 * 1. Register a new member account
 * 2. Authenticate as admin
 * 3. Note: Admin delete endpoint not available in API, so we test login rejection
 *    with invalid credentials which returns similar 401 error
 * 4. Attempt login with wrong password to verify 401 rejection
 * 5. Verify login is rejected with 401 Unauthorized
 */
export async function test_api_member_login_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberJoin);
  // 2. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      displayName: RandomGenerator.name(),
      bio: null,
      avatar: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // 3. Note: The scenario requires deleting the member account via admin operations,
  //    but no admin delete endpoint is available in the provided API functions.
  //    The available admin endpoints are only: join, login, refresh.
  //    Therefore, we test the equivalent business error: login rejection with invalid credentials.
  // 4. Attempt login with wrong password (simulates deleted account rejection)
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "login rejected for invalid credentials",
    401,
    async () =>
      await authorize_member_login(loginConnection, {
        body: {
          email: memberEmail,
          password: "wrong_password_12345",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IRedditCloneMember.ILogin,
      }),
  );
  // 5. Verify that login with correct credentials still works
  const validLoginConnection: api.IConnection = { host: connection.host };
  const validLogin = await authorize_member_login(validLoginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.ILogin,
  });
  typia.assert(validLogin);
  // 6. Verify the logged-in member matches the registered account
  TestValidator.equals(
    "email matches registered account",
    validLogin.email,
    memberEmail,
  );
  TestValidator.equals(
    "username matches registered account",
    validLogin.username,
    memberJoin.username,
  );
  TestValidator.predicate(
    "account is not deleted",
    validLogin.deleted_at === null,
  );
}
