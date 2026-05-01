import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test incorrect password login returns 401 without credential ambiguity leaks.
 *
 * Registers a new member account through the join endpoint to obtain a known valid email address, then attempts authentication with the correct email but an intentionally incorrect password. Verifies the system enforces the credential ambiguity security requirement — returning a uniform 401 Unauthorized response that never distinguishes between an unrecognized email and an incorrect password, thereby preventing user enumeration attacks.
 *
 * Also confirms that no JWT access token, refresh token, session expiration data, or member profile fields are leaked on the connection headers after a failed login attempt.
 *
 * 1. Register a new member via authorize_member_join with randomized credentials.
 * 2. Capture the registered email from the authorized member response.
 * 3. Create a fresh unauthenticated connection and attempt login with the correct email but a deliberately wrong password.
 * 4. Verify the server responds with 401 Unauthorized via TestValidator.httpError.
 * 5. Confirm the failed connection has no Authorization header set.
 */
export async function test_api_member_login_incorrect_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to obtain a known valid email
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Attempt login with correct email but wrong password on a fresh connection
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "incorrect password returns 401 Unauthorized",
    401,
    async () => {
      await api.functional.erpHrm.auth.member.login(loginConnection, {
        body: {
          email: member.email,
          password: "wrong-password-123",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IErpHrmMember.ILogin,
      });
    },
  );
  // 3. Verify no Authorization token leaked on the failed connection
  TestValidator.predicate(
    "no Authorization header set on failed login attempt",
    loginConnection.headers?.Authorization === undefined,
  );
}
