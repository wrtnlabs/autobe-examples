import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_profile_update_boundary_values(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and obtain authentication
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.MaxLength<254> & tags.Format<"email">>(),
      password: "Password123!",
      password_confirm: "Password123!",
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  // 2. Test maximum boundary: exactly 50 characters
  const maxName = RandomGenerator.alphabets(50);
  const maxResult = await api.functional.todoApp.user.profile.update(
    userConnection,
    {
      body: {
        display_name: maxName,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(maxResult);
  TestValidator.equals(
    "max boundary display_name",
    maxResult.display_name,
    maxName,
  );
  // 3. Test minimum boundary: exactly 1 character
  const minName = RandomGenerator.alphabets(1);
  const minResult = await api.functional.todoApp.user.profile.update(
    userConnection,
    {
      body: {
        display_name: minName,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(minResult);
  TestValidator.equals(
    "min boundary display_name",
    minResult.display_name,
    minName,
  );
}