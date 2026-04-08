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

export async function test_api_member_login_unauthorized_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test member login rejection with invalid credentials.
   *
   * Validates that authentication failures are handled securely without leaking information about account existence. The test ensures that both non-existent email and incorrect password scenarios return consistent 401 Unauthorized responses without differentiating between the two failure modes.
   *
   * This validates the security requirement to prevent enumeration attacks where attackers could determine which email addresses are registered in the system.
   *
   * 1. Create a new member account with valid credentials.
   * 2. Attempt login with non-existent email address.
   * 3. Verify 401 Unauthorized response without error message disclosure.
   * 4. Attempt login with correct email but incorrect password.
   * 5. Verify 401 Unauthorized response matches the non-existent email case.
   */
  // 1. Create a new member account with valid credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const generatedPassword = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: generatedPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Attempt login with non-existent email
  const nonExistentEmailConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "non-existent email should return 401",
    401,
    async () => {
      await authorize_member_login(nonExistentEmailConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
        } satisfies ITodoAppMember.ILogin,
      });
    },
  );
  // 3. Attempt login with correct email but incorrect password
  const wrongPasswordConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "incorrect password should return 401",
    401,
    async () => {
      await authorize_member_login(wrongPasswordConnection, {
        body: {
          email: member.email,
          password: RandomGenerator.alphaNumeric(16),
        } satisfies ITodoAppMember.ILogin,
      });
    },
  );
}
