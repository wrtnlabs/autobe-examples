import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_session_access_restriction(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate that an administrator cannot inspect an inaccessible session.
   *
   * This scenario focuses on the session access boundary for administrator lookups.
   * It verifies that a signed-in administrator does not receive session details
   * when requesting a session identifier that is outside the permitted inspection
   * scope, and that the API responds with a forbidden or not-found outcome.
   *
   * 1. Register and authenticate an administrator using an isolated connection.
   * 2. Request a random session identifier through the administrator session lookup endpoint.
   * 3. Confirm the endpoint rejects the access with a forbidden or not-found HTTP error.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "administrator session access restriction",
    [403, 404],
    async () => {
      await api.functional.mallPlatform.administrator.sessions.at(
        administratorConnection,
        {
          sessionId,
        },
      );
    },
  );
}
