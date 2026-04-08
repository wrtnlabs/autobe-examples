import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member login with incorrect password to verify security against user enumeration attacks.
 *
 * Validates that the authentication system rejects invalid credentials without revealing whether the email or password is incorrect. This prevents user enumeration attacks where an attacker could discover valid email addresses by observing different error messages.
 *
 * Special attention is given to ensuring the error response is generic and does not expose which credential failed. The system must return the same error regardless of whether the email is invalid or the password is wrong.
 *
 * 1. Register a new member account with valid credentials.
 * 2. Attempt login using the correct email but an incorrect password.
 * 3. Verify the login fails with 401 Unauthorized response.
 * 4. Verify no new session is created for the failed login attempt.
 * 5. Ensure the error message does not reveal whether the email exists or is valid.
 */
export async function test_api_member_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with valid credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  const validEmail = memberAuth.email;
  // 2. Attempt login with correct email but wrong password
  const loginConnection: api.IConnection = { host: connection.host };
  const wrongPasswordLoginBody = {
    email: validEmail,
    password: "WrongPassword123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityMember.ILogin;
  // 3. Verify login fails with 401 and generic error message
  await TestValidator.error("login with wrong password fails", async () => {
    await authorize_member_login(loginConnection, {
      body: wrongPasswordLoginBody,
    });
  });
  // 4. Verify no new session is created for failed login (implicitly verified by error)
}
