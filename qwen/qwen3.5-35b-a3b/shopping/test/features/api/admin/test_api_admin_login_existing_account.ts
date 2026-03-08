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

export async function test_api_admin_login_existing_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account via join operation
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const originalPassword = RandomGenerator.alphaNumeric(16);
  const joinResponse = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: originalPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(joinResponse);
  // Step 2: Login with existing admin credentials
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: joinResponse.email,
      password: originalPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(loginResponse);
  // Step 3: Validate login response structure
  TestValidator.equals(
    "admin email matches",
    loginResponse.email,
    joinResponse.email,
  );
  TestValidator.equals("admin is not banned", loginResponse.is_banned, false);
  TestValidator.equals("admin id matches", loginResponse.id, joinResponse.id);
  TestValidator.equals(
    "admin ban_reason is null",
    loginResponse.ban_reason,
    null,
  );
  TestValidator.equals(
    "created_at matches",
    loginResponse.created_at,
    joinResponse.created_at,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !Number.isNaN(Date.parse(loginResponse.updated_at)),
  );
  // Step 4: Validate token structure
  typia.assert(loginResponse.token);
  TestValidator.predicate(
    "access token is non-empty",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    !Number.isNaN(Date.parse(loginResponse.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    !Number.isNaN(Date.parse(loginResponse.token.refreshable_until)),
  );
  TestValidator.predicate(
    "expired_at is before refreshable_until",
    loginResponse.token.expired_at < loginResponse.token.refreshable_until,
  );
}
