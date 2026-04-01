import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_login_with_correct_credentials(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joined = await authorize_administrator_join(joinConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "administrator email should match joined email",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "administrator id should remain the same",
    authorized.id,
    joined.id,
  );
  TestValidator.equals(
    "administrator grade should remain the same",
    authorized.grade,
    joined.grade,
  );
  TestValidator.equals(
    "administrator status should remain the same",
    authorized.status,
    joined.status,
  );
  const failureConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "administrator login should fail with wrong password",
    async () => {
      await authorize_administrator_login(failureConnection, {
        body: {
          email,
          password: `${password}x`,
        } satisfies IMallPlatformAdministrator.ILogin,
      });
    },
  );
}
