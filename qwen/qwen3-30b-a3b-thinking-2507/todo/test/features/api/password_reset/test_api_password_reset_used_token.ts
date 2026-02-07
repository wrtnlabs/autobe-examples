import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import type { ITodoUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_user_password_resets_create } from "../../../generate/generate_random_todo_user_password_resets_create";
import { prepare_random_todo_user_password_reset } from "../../../prepare/prepare_random_todo_user_password_reset";

export async function test_api_password_reset_used_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: `${RandomGenerator.name()}@${RandomGenerator.name()}.com`,
      password: "password123",
    },
  });
  // 2. Create password reset record
  const passwordReset = await generate_random_todo_user_password_resets_create(
    userConnection,
    {},
  );
  // 3. Retrieve the password reset record
  const resetRecord = await api.functional.todo.user.password_resets.at(
    userConnection,
    {
      resetId: passwordReset.id,
    },
  );
  typia.assert(resetRecord!);
  // 4. Verify used_at is not null
  TestValidator.predicate(
    "used_at should be set (token has been used)",
    resetRecord.used_at !== null,
  );
}
