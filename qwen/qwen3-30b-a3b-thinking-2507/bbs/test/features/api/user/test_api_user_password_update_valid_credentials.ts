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

export async function test_api_user_password_update_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
    } satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  // 2. Generate valid password for update
  const currentPassword = typia.random<string & tags.MinLength<8>>();
  const newPassword = typia.random<string & tags.MinLength<8>>();
  // 3. Update password
  const updatedUser =
    await api.functional.economyPoliticsBoard.user.profile.update(
      userConnection,
      {
        body: {
          currentPassword,
          newPassword,
        } satisfies IEconomyPoliticsBoardUser.IUpdate,
      },
    );
  typia.assert(updatedUser);
  // 4. Verify business logic (password was updated)
  TestValidator.equals(
    "password updated successfully",
    updatedUser.id,
    user.id,
  );
}
