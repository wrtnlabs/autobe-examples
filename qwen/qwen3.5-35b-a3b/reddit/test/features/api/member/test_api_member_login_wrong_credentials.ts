import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_wrong_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account with valid credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    username:
      RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformMember.IJoin;
  const registeredMember = await authorize_member_join(joinConnection, {
    body: joinInput,
  });
  typia.assert(registeredMember);
  // Step 2: Attempt login with wrong password (correct email, wrong password)
  const loginConnection: api.IConnection = { host: connection.host };
  const wrongPasswordInput = {
    email: joinInput.email,
    password: "wrong_password_123",
  } satisfies IRedditPlatformMember.ILogin;
  // Step 3: Verify authentication failure with 401 Unauthorized
  await TestValidator.error("login with wrong password fails", async () => {
    await authorize_member_login(loginConnection, {
      body: wrongPasswordInput,
    });
  });
}
