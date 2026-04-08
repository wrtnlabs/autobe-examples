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
 * Test login failure when email address does not exist in the system.
 *
 * Validates that the authentication system properly rejects login attempts with email addresses that have never been registered. The test registers a valid member account first, then attempts to login with a completely different, non-existent email address to verify the system returns an appropriate authentication error.
 *
 * This test ensures that:
 * - Login with non-existent email fails with HTTP error (401 or 404)
 * - No authentication tokens are issued for non-existent accounts
 * - The system handles authentication failures gracefully
 *
 * 1. Register a new member account with valid credentials.
 * 2. Generate a completely different email address that does not exist in the system.
 * 3. Attempt to login with the non-existent email and a random password.
 * 4. Verify that the login operation throws an HTTP error.
 * 5. Confirm that no authentication session is created.
 */
export async function test_api_member_login_non_existent_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a valid member to establish system state
  const memberConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(registeredMember);
  // 2. Generate a completely different, non-existent email
  const nonExistentEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  // 3. Attempt login with non-existent email
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "login with non-existent email should fail",
    [401, 404],
    async () => {
      await authorize_member_login(loginConnection, {
        body: {
          email: nonExistentEmail,
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IRedditCloneMember.ILogin,
      });
    },
  );
}
