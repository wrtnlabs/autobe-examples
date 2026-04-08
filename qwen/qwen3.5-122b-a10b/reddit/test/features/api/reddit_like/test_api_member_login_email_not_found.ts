import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member login fails when email address is not registered.
 *
 * Validates that the authentication system correctly rejects login attempts with non-existent email addresses. This ensures that only registered members can authenticate and prevents unauthorized access attempts.
 *
 * The test creates a valid member account first, then attempts to login with a completely different email address that does not exist in the system. The login operation should fail with an appropriate error.
 *
 * 1. Create a valid member account with unique email and credentials.
 * 2. Attempt to login with a non-existent email address.
 * 3. Validate that the login attempt throws an error.
 * 4. Ensure the existing member account remains unaffected.
 */
export async function test_api_member_login_email_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a valid member account
  const joinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Attempt to login with non-existent email
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await authorize_member_login(loginConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "anyPassword123",
        } satisfies IRedditLikeMember.ILogin,
      });
    },
  );
}
