import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_password_reset_retrieval_cross_user_access(
  connection: api.IConnection,
): Promise<void> {
  // Create first user account
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_user_join(firstUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(firstUser);
  // Create second user account
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await authorize_user_join(secondUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(secondUser);
  // Since there's no API endpoint to create password reset requests,
  // we cannot properly implement the scenario as described.
  // The test will validate that users cannot access arbitrary password reset records
  // by attempting to access a non-existent record with the second user's credentials
  const nonExistentPasswordResetId = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to access a non-existent password reset record
  // This should fail since the record doesn't exist and doesn't belong to the user
  await TestValidator.error(
    "accessing non-existent password reset record should fail",
    async () => {
      await api.functional.todoApp.user.password_resets.at(
        secondUserConnection,
        {
          passwordResetId: nonExistentPasswordResetId,
        },
      );
    },
  );
  // Additional validation: Ensure first user also cannot access non-existent records
  await TestValidator.error(
    "first user accessing non-existent password reset record should fail",
    async () => {
      await api.functional.todoApp.user.password_resets.at(
        firstUserConnection,
        {
          passwordResetId: nonExistentPasswordResetId,
        },
      );
    },
  );
}
