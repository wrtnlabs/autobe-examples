import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_registration_duplicate_email(
  connection: api.IConnection,
) {
  const email = typia.random<string & tags.Format<"email">>();
  const userData1 = {
    email,
    name: RandomGenerator.name(),
    password: "1234",
  } satisfies ITodoListUser.ICreate;

  const user1: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: userData1,
    },
  );
  typia.assert(user1);

  await TestValidator.error(
    "duplicate email should fail",
    async () =>
      await api.functional.auth.user.join(connection, {
        body: userData1,
      }),
  );
}
