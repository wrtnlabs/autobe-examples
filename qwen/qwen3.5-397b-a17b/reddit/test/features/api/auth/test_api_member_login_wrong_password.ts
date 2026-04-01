import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
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
  // 1. Create member account with known credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Attempt login with correct email but wrong password
  const loginConnection: api.IConnection = { host: connection.host };
  const wrongPassword = RandomGenerator.alphaNumeric(16);
  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      await authorize_member_login(loginConnection, {
        body: {
          email: testEmail,
          password: wrongPassword,
        } satisfies IRedditCommunityMember.ILogin,
      });
    },
  );
  // 3. Verify login with correct credentials works
  const correctLoginConnection: api.IConnection = { host: connection.host };
  const correctLoginResult = await authorize_member_login(
    correctLoginConnection,
    {
      body: {
        email: testEmail,
        password: testPassword,
      } satisfies IRedditCommunityMember.ILogin,
    },
  );
  typia.assert(correctLoginResult);
  // 4. Verify the authorized user is the same as joined user
  TestValidator.equals("user ID matches", correctLoginResult.id, joinResult.id);
}
