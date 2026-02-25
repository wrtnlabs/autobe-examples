import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test login with incorrect password returns 401 Unauthorized.
 *
 * This test verifies:
 * 1. A member can register successfully with valid credentials
 * 2. Login with the correct email but incorrect password fails
 * 3. The API returns 401 status (not revealing whether email exists)
 */
export async function test_api_member_login_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account with known credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const correctPassword = "ValidPass123!";
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      password: correctPassword,
    },
  });
  typia.assert(authorized);
  // 2. Attempt login with correct email but incorrect password
  const loginConnection: api.IConnection = { host: connection.host };
  const incorrectPassword = "WrongPassword456!";
  await TestValidator.httpError(
    "login with incorrect password should return 401",
    401,
    async () => {
      await api.functional.community.auth.member.login(loginConnection, {
        body: {
          email: authorized.email,
          password: incorrectPassword,
          href: "https://example.com/login",
          referrer: "https://example.com",
        } satisfies ICommunityMember.ILogin,
      });
    },
  );
}
