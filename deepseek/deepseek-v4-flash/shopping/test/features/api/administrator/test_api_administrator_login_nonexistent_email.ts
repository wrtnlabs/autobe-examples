import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_login_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  // Create a fresh connection for the login attempt
  const adminConnection: api.IConnection = { host: connection.host };
  // Use an email that is guaranteed to never have been registered
  const nonexistentEmail: string & tags.Format<"email"> =
    `nonexistent-admin-${typia.random<string & tags.Format<"uuid">>()}@example.com` satisfies string &
      tags.Format<"email">;
  // Attempt to login with the nonexistent email — expect 404 Not Found
  await TestValidator.httpError(
    "login with nonexistent email",
    404,
    async () => {
      await authorize_administrator_login(adminConnection, {
        body: {
          email: nonexistentEmail,
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IECommerceMallAdministrator.ILogin,
      });
    },
  );
}
