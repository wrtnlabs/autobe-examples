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

export async function test_api_admin_login_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account first
  const adminConnection: api.IConnection = { host: connection.host };
  const joinCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    permissions_level: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  const adminAccount = await authorize_admin_join(adminConnection, {
    body: joinCredentials,
  });
  typia.assert(adminAccount);
  // Now test login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: joinCredentials.email,
      password: joinCredentials.password,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(loginResult);
  // Validate basic identity fields match
  TestValidator.equals("admin id matches", loginResult.id, adminAccount.id);
  TestValidator.equals(
    "email matches",
    loginResult.email,
    joinCredentials.email,
  );
  TestValidator.equals(
    "display name matches",
    loginResult.display_name,
    joinCredentials.display_name,
  );
  // Validate token structure exists (typia.assert already validated the types)
  TestValidator.predicate(
    "tokens are generated",
    loginResult.token.access.length > 0 && loginResult.token.refresh.length > 0,
  );
  // Validate account status
  TestValidator.predicate("account is active", loginResult.is_active === true);
  TestValidator.predicate(
    "account not deleted",
    loginResult.deleted_at === null,
  );
}
