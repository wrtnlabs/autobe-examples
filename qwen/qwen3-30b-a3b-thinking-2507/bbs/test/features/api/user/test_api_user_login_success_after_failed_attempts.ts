import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_login_success_after_failed_attempts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create new user account
  const userConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(8);
  await authorize_user_join(userConnection, {
    body: { email, password },
  });
  // 2. Attempt login 5 times with wrong passwords
  const wrongPasswords = ArrayUtil.repeat(5, () =>
    RandomGenerator.alphaNumeric(8),
  );
  for (const wrongPassword of wrongPasswords) {
    await TestValidator.error("login attempt with wrong password", async () => {
      await authorize_user_login(userConnection, {
        body: { email, password: wrongPassword },
      });
    });
  }
  // 3. Wait for 5 seconds (simulating 15-minute lockout period)
  await new Promise((resolve) => setTimeout(resolve, 5000));
  // 4. Successful login attempt with correct credentials
  const loginResult = await authorize_user_login(userConnection, {
    body: { email, password },
  });
  // 5. Validate successful login
  TestValidator.equals("email matches input", loginResult.email, email);
  TestValidator.predicate(
    "authentication token exists",
    !!loginResult.token.access,
  );
}
