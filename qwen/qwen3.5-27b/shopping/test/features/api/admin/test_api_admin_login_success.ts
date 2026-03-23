import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful administrator login with valid credentials.
 * 1. Register a new admin account using the join endpoint
 * 2. Extract credentials used during registration
 * 3. Login with the same credentials
 * 4. Verify the response contains valid admin identity and tokens
 */
export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for registration
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Register new admin account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const joinResult = await authorize_admin_join(adminConnection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(joinResult);
  // 3. Create new connection for login (fresh connection)
  const loginConnection: api.IConnection = { host: connection.host };
  // 4. Login with registered credentials
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(loginResult);
  // 5. Verify admin identity information
  TestValidator.equals(
    "admin id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      loginResult.id,
    ),
    true,
  );
  TestValidator.equals("email matches input", loginResult.email, email);
  TestValidator.equals("grade is regular", loginResult.grade, "regular");
  TestValidator.equals("status is active", loginResult.status, "active");
  TestValidator.predicate(
    "created_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      loginResult.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      loginResult.updated_at,
    ),
  );
  TestValidator.equals("deleted_at is null", loginResult.deleted_at, null);
  // 6. Verify token structure
  TestValidator.predicate(
    "access token exists",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      loginResult.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      loginResult.token.refreshable_until,
    ),
  );
  // 7. Verify token validity periods
  const expiredAt = new Date(loginResult.token.expired_at);
  const refreshableUntil = new Date(loginResult.token.refreshable_until);
  const now = new Date();
  TestValidator.predicate(
    "access token expires in ~1 hour",
    (expiredAt.getTime() - now.getTime()) / (1000 * 60) >= 55 &&
      (expiredAt.getTime() - now.getTime()) / (1000 * 60) <= 65,
  );
  TestValidator.predicate(
    "refresh token valid for ~7 days",
    (refreshableUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) >= 6 &&
      (refreshableUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 8,
  );
}
