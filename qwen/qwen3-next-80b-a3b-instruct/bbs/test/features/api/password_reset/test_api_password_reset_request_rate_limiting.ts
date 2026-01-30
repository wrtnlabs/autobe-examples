import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";
import type { IEconomicForumUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUserPasswordReset";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_password_reset_request_rate_limiting(
  connection: api.IConnection,
): Promise<void> {
  // Create user account for testing using the recommended utility function
  const userAuth = await authorize_user_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicForumUser.IJoin,
  });
  typia.assert(userAuth);
  // Extract the email from the created user for password reset testing
  const userMail = userAuth.email;
  // Create a dedicated connection for password reset requests (base connection is appropriate as endpoint is public)
  const resetConnection: api.IConnection = { host: connection.host };
  // Perform first three valid password reset requests
  for (let i = 0; i < 3; i++) {
    await api.functional.economicForum.user.auth.users.password.resets.create(
      resetConnection,
      {
        body: { email: userMail } satisfies IEconomicForumUserPasswordReset,
      },
    );
  }
  // Fourth request within the same hour should be rate limited
  await TestValidator.error(
    "fourth password reset request within hour should be rate limited",
    async () => {
      await api.functional.economicForum.user.auth.users.password.resets.create(
        resetConnection,
        {
          body: { email: userMail } satisfies IEconomicForumUserPasswordReset,
        },
      );
    },
  );
  // Wait 61 minutes to ensure counter resets
  await new Promise((resolve) => setTimeout(resolve, 61 * 60 * 1000));
  // After 61 minutes, fourth request should succeed
  await api.functional.economicForum.user.auth.users.password.resets.create(
    resetConnection,
    {
      body: { email: userMail } satisfies IEconomicForumUserPasswordReset,
    },
  );
}
