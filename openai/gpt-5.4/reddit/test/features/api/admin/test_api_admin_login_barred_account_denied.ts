import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_barred_account_denied(
  connection: api.IConnection,
): Promise<void> {
  const setupConnection: api.IConnection = { host: connection.host };
  const setupJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin1234!setup" satisfies string & tags.Format<"password">,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  const setupJoin = await authorize_admin_join(setupConnection, {
    body: setupJoinInput,
  });
  typia.assert(setupJoin);
  TestValidator.equals(
    "setup connection authorized after join",
    setupConnection.headers?.Authorization,
    setupJoin.token.access,
  );
  TestValidator.equals(
    "setup admin email matches join input",
    setupJoin.email,
    setupJoinInput.email,
  );
  const barredConnection: api.IConnection = { host: connection.host };
  // This account must be pre-arranged by the test environment in a barred state
  // while still retaining valid credentials for policy-based denial testing.
  const barredLogin = {
    email: "barred.admin@example.com" satisfies string & tags.Format<"email">,
    password: "Admin1234!barred" satisfies string & tags.Format<"password">,
    href: "https://e2e.example.com/admin/login" satisfies string &
      tags.Format<"uri">,
    referrer: "https://e2e.example.com/admin" satisfies string &
      tags.Format<"uri">,
    ip: "203.0.113.10" satisfies string & tags.Format<"ipv4">,
  } satisfies ICommunityPlatformAdmin.ILogin;
  await TestValidator.httpError(
    "barred admin login is denied",
    [401, 403, 404, 409, 422],
    async () => {
      await authorize_admin_login(barredConnection, {
        body: barredLogin,
      });
    },
  );
  TestValidator.equals(
    "barred login does not establish authorization header",
    barredConnection.headers?.Authorization,
    undefined,
  );
}
