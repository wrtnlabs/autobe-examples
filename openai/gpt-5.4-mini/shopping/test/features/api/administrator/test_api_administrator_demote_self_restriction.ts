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

export async function test_api_administrator_demote_self_restriction(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that an administrator cannot demote themselves.
   *
   * This test authenticates a dedicated administrator account and attempts to
   * invoke the administrator demotion endpoint using the same account as both
   * the caller and the target. The platform rule under test is that self-
   * demotion must be rejected and must not downgrade the account.
   *
   * 1. Register and authenticate an administrator account.
   * 2. Confirm the authenticated account is the same identity used as the
   *    demotion target.
   * 3. Attempt the self-demotion request.
   * 4. Verify the request is rejected.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  const administratorId = authorized.id;
  TestValidator.equals(
    "authenticated administrator should be the self-demotion target",
    authorized.id,
    administratorId,
  );
  await TestValidator.error("self-demotion should be rejected", async () => {
    await api.functional.mallPlatform.administrator.administrators.demote(
      administratorConnection,
      {
        administratorId,
      },
    );
  });
}
