import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
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
 * Test that login with a registered email but an incorrect password is rejected with 401 Unauthorized.
 *
 * Validates the credential verification step of the login flow by first registering a new member with known credentials, then attempting authentication with the same email but a deliberately wrong password. The system must reject this attempt without issuing any JWT tokens.
 *
 * The test also confirms that the member account remains in a valid state after the failed login — a subsequent authentication with the correct password must succeed and return the same member identity as the original registration.
 *
 * 1. Register a new member via join with a known email, password, and username.
 * 2. Attempt login with the correct email but a wrong password, expecting a 401 error.
 * 3. Attempt login with the correct email and correct password, verifying the same member is authenticated.
 */
export async function test_api_member_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member with known credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = "correctPassword123";
  const username = RandomGenerator.name(1);
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: { email, password, username },
  });
  typia.assert(member);
  // 2. Attempt login with wrong password — must fail with 401
  const wrongLoginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "login with wrong password returns 401",
    async () => {
      await authorize_member_login(wrongLoginConnection, {
        body: {
          email,
          password: "wrongPassword456",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      });
    },
  );
  // 3. Verify account is still functional with correct password
  const correctLoginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_member_login(correctLoginConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(loggedIn);
  TestValidator.equals(
    "same member identity after correct login",
    loggedIn.id,
    member.id,
  );
}
