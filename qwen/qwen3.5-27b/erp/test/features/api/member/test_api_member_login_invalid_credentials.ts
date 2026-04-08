import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member login failure with invalid credentials.
 *
 * Validates that the member authentication system properly rejects login attempts with incorrect passwords while maintaining security by not revealing whether the email exists or the password is wrong.
 *
 * Security requirement: The system must return a generic 401 Unauthorized response without disclosing whether the failure is due to an invalid email or incorrect password. This prevents attackers from enumerating valid email addresses in the system.
 *
 * 1. Register a new member account with valid email and password using the join endpoint.
 * 2. Attempt to login with the registered email but an incorrect password.
 * 3. Verify that a 401 Unauthorized HTTP error is thrown.
 * 4. Verify that no authentication tokens are leaked in the error response.
 */
export async function test_api_member_login_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection);
  typia.assert(member);
  // 2. Execution: Attempt login with incorrect password
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: member.email,
    password: "wrong_password_12345",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IHrmTimeTrackMember.ILogin;
  // 3. Validation: Verify 401 Unauthorized error is thrown
  await TestValidator.httpError(
    "login with invalid password returns 401",
    401,
    async () =>
      await authorize_member_login(loginConnection, { body: loginBody }),
  );
}
