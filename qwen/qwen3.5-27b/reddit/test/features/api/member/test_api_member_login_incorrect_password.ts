import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member login failure when incorrect password is provided.
 *
 * Validates the authentication security mechanism by registering a new member account and then attempting login with the correct email but an incorrect password. The system should verify the password using bcrypt.compare against the stored hash, detect the mismatch, and reject the authentication attempt with a 401 error.
 *
 * This test ensures that:
 * - Password verification correctly rejects incorrect passwords
 * - No session is created when authentication fails
 * - No tokens are returned on failed login attempts
 *
 * 1. Register a new member account with valid email, password, and unique username.
 * 2. Attempt to login with the correct email but an incorrect password.
 * 3. Verify that the login fails with an authentication error.
 */
export async function test_api_member_login_incorrect_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "correct_password_123",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(registeredMember);
  // 2. Attempt login with incorrect password
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("login with incorrect password fails", async () => {
    await authorize_member_login(loginConnection, {
      body: {
        email: registeredMember.email,
        password: "wrong_password_xyz",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCloneMember.ILogin,
    });
  });
}
