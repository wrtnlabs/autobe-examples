import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorPasswordReset";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministratorPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_password_reset_token_reuse_blocked(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const token = typia.random<string>();
  const firstPassword = RandomGenerator.alphaNumeric(18);
  const secondPassword = RandomGenerator.alphaNumeric(18);
  await TestValidator.error(
    "password reset token should be rejected when not valid",
    async () => {
      await api.functional.mallPlatform.administrator.password_resets.index(
        administratorConnection,
        {
          body: {
            token,
            password: firstPassword,
            page: 1,
            limit: 1,
          } satisfies IMallPlatformAdministratorPasswordReset.IRequest,
        },
      );
    },
  );
  await TestValidator.error(
    "password reset token cannot be reused",
    async () => {
      await api.functional.mallPlatform.administrator.password_resets.index(
        administratorConnection,
        {
          body: {
            token,
            password: secondPassword,
            page: 1,
            limit: 1,
          } satisfies IMallPlatformAdministratorPasswordReset.IRequest,
        },
      );
    },
  );
}
