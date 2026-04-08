import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_password_reset_lookup_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that administrator password reset lookup returns not found for a missing record.
   *
   * This test validates the protected administrator lookup endpoint using an authenticated
   * administrator connection and confirms that a non-existent reset identifier produces a
   * not-found error. The lookup must remain read-only and must not return any password reset
   * record payload when the identifier cannot be resolved.
   *
   * 1. Register an administrator and establish an authenticated administrator connection.
   * 2. Request a password reset record using a syntactically valid UUID that should not exist.
   * 3. Confirm the endpoint responds with a not-found HTTP error.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const resetId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.httpError(
    "administrator password reset lookup not found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.password_resets.at(
        administratorConnection,
        {
          resetId,
        },
      );
    },
  );
}
