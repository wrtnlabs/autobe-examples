import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
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
  // 1. Register new admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminDisplayName = RandomGenerator.name();
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_admin_join(joinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Validate join response structure
  TestValidator.equals("join is active", joinResponse.is_active, true);
  TestValidator.equals("join has valid id", joinResponse.id, "uuid");
  TestValidator.equals(
    "join deleted_at is null",
    joinResponse.deleted_at,
    null,
  );
  // 3. Login with same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_admin_login(loginConnection, {
    body: {
      email: joinResponse.email,
      password: adminPassword,
    } satisfies IRedditCommunityAdmin.ILogin,
  });
  typia.assert(loginResponse);
  // 4. Validate login response
  TestValidator.equals("login is active", loginResponse.is_active, true);
  TestValidator.equals(
    "login id matches join",
    loginResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "login email matches",
    loginResponse.email,
    joinResponse.email,
  );
  TestValidator.equals(
    "login display_name matches",
    loginResponse.display_name,
    joinResponse.display_name,
  );
  TestValidator.equals(
    "login deleted_at is null",
    loginResponse.deleted_at,
    null,
  );
  // 5. Validate token structure
  TestValidator.predicate(
    "access token present",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid",
    loginResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid",
    loginResponse.token.refreshable_until.length > 0,
  );
  // 6. Validate admin_id claim is embedded in response id
  TestValidator.equals("response id is valid uuid", loginResponse.id, "uuid");
  TestValidator.predicate("admin has email", loginResponse.email.length > 0);
  TestValidator.predicate(
    "admin has timestamp",
    loginResponse.created_at.length > 0,
  );
  TestValidator.predicate(
    "admin has timestamp",
    loginResponse.updated_at.length > 0,
  );
}
