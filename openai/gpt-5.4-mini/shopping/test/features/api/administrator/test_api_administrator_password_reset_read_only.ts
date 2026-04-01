import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_password_reset_read_only(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const passwordResetId = typia.random<string & tags.Format<"uuid">>();
  const before =
    await api.functional.mallPlatform.administrator.password_resets.at(
      administratorConnection,
      {
        passwordResetId,
      },
    );
  typia.assert(before);
  TestValidator.predicate(
    "password reset token is present",
    before.token.length > 0,
  );
  TestValidator.predicate(
    "password reset expiration is present",
    before.expiredAt.length > 0,
  );
  TestValidator.predicate(
    "password reset createdAt is present",
    before.createdAt.length > 0,
  );
  TestValidator.predicate(
    "password reset updatedAt is present",
    before.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "password reset deletedAt is null when active",
    before.deletedAt === null,
  );
  TestValidator.predicate(
    "administrator summary deletedAt is null when active",
    before.administrator.deletedAt === null,
  );
  const after =
    await api.functional.mallPlatform.administrator.password_resets.at(
      administratorConnection,
      {
        passwordResetId,
      },
    );
  typia.assert(after);
  TestValidator.equals("repeat lookup returns the same record", after, before);
}
