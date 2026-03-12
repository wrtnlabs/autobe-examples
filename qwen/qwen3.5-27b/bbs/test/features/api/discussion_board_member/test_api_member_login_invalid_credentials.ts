import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
 * Test member login with invalid credentials.
 * 1. Create a member account with known credentials
 * 2. Attempt login with correct email but wrong password
 * 3. Verify the system rejects the authentication attempt
 */
export async function test_api_member_login_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with known credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const testEmail = typia.random<string & tags.Format<"email">>();
  const correctPassword = typia.random<string & tags.Format<"password">>();
  const member = await authorize_member_join(joinConnection, {
    body: {
      email: testEmail,
      password: correctPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Attempt login with incorrect password
  const loginConnection: api.IConnection = { host: connection.host };
  const incorrectPassword = typia.random<string & tags.Format<"password">>();
  // 3. Validate that login fails with error
  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      await authorize_member_login(loginConnection, {
        body: {
          email: testEmail,
          password: incorrectPassword,
        } satisfies IDiscussionBoardMember.ILogin,
      });
    },
  );
}
