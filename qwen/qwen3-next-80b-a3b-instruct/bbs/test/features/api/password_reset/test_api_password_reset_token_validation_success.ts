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
export async function test_api_password_reset_token_validation_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new user account
  const user = await authorize_user_join(connection, {
    body: {},
  });
  typia.assert(user);
  // Step 2: Initiate password reset request to generate valid token
  await api.functional.economicForum.user.auth.users.password.resets.create(
    connection,
    {
      body: {
        email: user.email,
      } satisfies IEconomicForumUserPasswordReset,
    },
  );
  // Step 3: Generate a valid UUID token for testing (assuming system uses UUID format)
  const token = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Validate the password reset token
  const response =
    await api.functional.economicForum.user.auth.users.password.resets.at(
      connection,
      {
        token,
      },
    );
  typia.assert(response);
  // Step 5: Verify that the response contains the user's email
  TestValidator.equals(
    "response should contain the user's email",
    response.email,
    user.email,
  );
}
