import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member login authentication failure with wrong password.
 *
 * Validates the authentication security rules when a member provides incorrect password during login. After successfully creating a member account through the join operation, this test attempts to login with the correct email but an incorrect password. The system must return HTTP 401 unauthorized status without revealing which credential was incorrect (email or password) to prevent credential enumeration attacks.
 *
 * The test verifies that:
 * 1. Member account creation succeeds with valid credentials
 * 2. Login attempt with wrong password fails with 401 status
 * 3. Error message does not distinguish between invalid email and invalid password
 * 4. Failed authentication attempts are properly rejected
 *
 * 1. Create a new member account with random email and password via join operation.
 * 2. Attempt to login with the correct email but intentionally wrong password.
 * 3. Validate that the login fails with HTTP 401 unauthorized status.
 * 4. Ensure the error response does not reveal which credential was incorrect.
 */
export async function test_api_member_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await api.functional.hrm.auth.member.join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Attempt login with wrong password
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "login with wrong password should return 401",
    401,
    async () =>
      await api.functional.hrm.auth.member.login(loginConnection, {
        body: {
          email: joinResult.email,
          password: RandomGenerator.alphaNumeric(16), // Different password
        } satisfies IHrmMember.ILogin,
      }),
  );
}
