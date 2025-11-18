import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_auth_token_refresh_empty_value(
  connection: api.IConnection,
) {
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "SecurePassword123!",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  await TestValidator.error("empty refresh token should fail", async () => {
    await api.functional.auth.user.refresh(connection, {
      body: {
        email: userEmail, // Use the original email value from join request
        password: "SecurePassword123!",
        refresh_token: "", // Empty refresh token to test validation
      } satisfies ITodoListUser.IRequest,
    });
  });
}
