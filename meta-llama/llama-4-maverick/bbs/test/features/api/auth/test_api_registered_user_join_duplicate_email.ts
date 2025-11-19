import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";

export async function test_api_registered_user_join_duplicate_email(
  connection: api.IConnection,
) {
  const initialUser = await api.functional.auth.registered_user.join(
    connection,
    {
      body: typia.random<IDiscussionBoardRegisteredUser.ICreate>() satisfies IDiscussionBoardRegisteredUser.ICreate,
    },
  );
  typia.assert(initialUser);

  await TestValidator.error(
    "duplicate email should fail",
    async () =>
      await api.functional.auth.registered_user.join(connection, {
        body: initialUser.email,
      }),
  );
}
