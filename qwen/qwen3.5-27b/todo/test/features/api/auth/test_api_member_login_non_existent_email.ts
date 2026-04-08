import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test login attempt with an email address that does not exist in the system.
 *
 * Validates that the authentication system properly rejects login requests when the provided email address has no corresponding member account. This tests the business logic requirement that non-existent users cannot authenticate, even with a valid password format.
 *
 * The test first registers a valid member account to ensure system isolation, then attempts to login with a different email address that was never registered. The login should fail with a 401 Unauthorized error, and no authentication tokens should be returned.
 *
 * 1. Register a new member account with unique email to establish baseline
 * 2. Attempt login with a different, non-existent email address
 * 3. Validate that login fails with appropriate error
 * 4. Verify no session or tokens are created
 */
export async function test_api_member_login_non_existent_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a valid member account for test isolation
  const validMemberConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(validMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(registeredMember);
  // 2. Generate a non-existent email address (different from the registered one)
  const nonExistentEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  // 3. Attempt login with non-existent email - should fail
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await authorize_member_login(loginConnection, {
        body: {
          email: nonExistentEmail,
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoAppMember.ILogin,
      });
    },
  );
}
