import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_registration_weak_password(
  connection: api.IConnection,
) {
  // Test user registration with a weak password
  const weakPassword = "1234";

  // Attempt to register with weak password
  await TestValidator.error(
    "should reject weak password due to insufficient complexity",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: weakPassword,
        } satisfies ITodoListUser.ICreate,
      });
    },
  );
}
