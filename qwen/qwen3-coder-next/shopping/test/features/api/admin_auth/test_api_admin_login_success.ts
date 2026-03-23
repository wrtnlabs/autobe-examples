import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account via registration
  const adminConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const registered = await authorize_admin_join(adminConnection, {
    body: { email, password } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(registered);
  // 2. Login with registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const logged = await authorize_admin_login(loginConnection, {
    body: { email, password } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(logged);
  // 3. Validate admin ID exists and is UUID format
  TestValidator.equals("admin ID exists", typeof logged.id, "string");
  TestValidator.predicate(
    "admin ID is UUID",
    /^[0-9a-f-]{36}$/i.test(logged.id),
  );
  // 4. Validate access token exists and format
  TestValidator.equals(
    "access token exists",
    typeof logged.token.access,
    "string",
  );
  TestValidator.predicate(
    "access token is JWT",
    logged.token.access.split(".").length === 3,
  );
  // 5. Validate refresh token exists and format
  TestValidator.equals(
    "refresh token exists",
    typeof logged.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "refresh token is JWT",
    logged.token.refresh.split(".").length === 3,
  );
  // 6. Validate expiration timestamps are ISO format date-time
  TestValidator.equals(
    "expired_at exists",
    typeof logged.token.expired_at,
    "string",
  );
  TestValidator.predicate(
    "expired_at is date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      logged.token.expired_at,
    ),
  );
  TestValidator.equals(
    "refreshable_until exists",
    typeof logged.token.refreshable_until,
    "string",
  );
  TestValidator.predicate(
    "refreshable_until is date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      logged.token.refreshable_until,
    ),
  );
  // 7. Verify access token expires before refreshable_until
  const accessExpired = new Date(logged.token.expired_at).getTime();
  const refreshUntil = new Date(logged.token.refreshable_until).getTime();
  TestValidator.predicate(
    "access token expires before refresh ends",
    accessExpired < refreshUntil,
  );
}
