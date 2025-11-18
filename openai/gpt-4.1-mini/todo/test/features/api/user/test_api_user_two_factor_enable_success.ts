import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_user_two_factor_enable_success(
  connection: api.IConnection,
) {
  // Step 1: User registration
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userName: string = RandomGenerator.name(2);

  const user: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        name: userName,
      } satisfies ITodoListTodoListUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Enable two-factor authentication
  // For test purposes, generate a valid fake two_factor_token as a random string
  const twoFactorToken: string = RandomGenerator.alphaNumeric(32);

  await api.functional.auth.user.two_factor.enable.enableTwoFactor(connection, {
    body: {
      two_factor_token: twoFactorToken,
    } satisfies ITodoListTodoListUser.IEnableTwoFactor,
  });
}
