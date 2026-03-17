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

export async function test_api_member_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member with known email and password
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name(1);
  const password = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(joinConnection, {
    body: {
      email,
      username,
      password,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Try to login with correct email but WRONG password (different password)
  const wrongPassword = RandomGenerator.alphaNumeric(16) + "xyz123"; // Different from original
  const loginConnection: api.IConnection = { host: connection.host };
  // 3. Verify authentication fails with generic error (no user enumeration)
  await TestValidator.error(
    "should reject login with wrong password",
    async () => {
      await authorize_member_login(loginConnection, {
        body: {
          email: member.email,
          password: wrongPassword,
        } satisfies IRedditLikeMember.ILogin,
      });
    },
  );
  // 4. Verify that the connection headers do NOT contain JWT token header set by successful login
  // (authorize_member_login should throw before setting Authorization header on failure)
  TestValidator.predicate(
    "no authorization header set on failed login",
    () => loginConnection.headers?.Authorization === undefined,
  );
}
