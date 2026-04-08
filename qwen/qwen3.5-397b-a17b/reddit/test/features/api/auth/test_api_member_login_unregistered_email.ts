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
 * Test login failure when attempting to authenticate with an email that is not registered in the system.
 *
 * Validates that the authentication endpoint properly rejects login attempts from unregistered email addresses with a 401 Unauthorized response. The test ensures the system correctly handles unknown user credentials without exposing whether the email exists or the password is wrong.
 *
 * 1. Create a registered member account using authorize_member_join to establish baseline system state with a valid user.
 * 2. Attempt to login using a completely different email address that has never been registered in the system.
 * 3. Validate that the login attempt fails with HTTP 401 Unauthorized status, confirming the system correctly rejects unknown user credentials.
 * 4. Ensure the error response does not expose whether the email exists or the password is wrong (security best practice).
 */
export async function test_api_member_login_unregistered_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a registered member account to establish baseline state
  const registeredMember = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(registeredMember);
  // 2. Create a fresh connection for testing unauthenticated login
  const loginConnection: api.IConnection = { host: connection.host };
  // 3. Attempt login with an unregistered email (different from the one we just created)
  const unregisteredEmail = typia.random<string & tags.Format<"email">>();
  // 4. Validate that login fails with 401 Unauthorized
  await TestValidator.httpError(
    "login with unregistered email should return 401",
    401,
    async () => {
      await api.functional.redditCommunity.auth.member.login(loginConnection, {
        body: {
          email: unregisteredEmail,
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IRedditCommunityMember.ILogin,
      });
    },
  );
}
