import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLoginAttempt";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_can_retrieve_login_attempts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Get a random UUID for the login attempt ID
  const loginAttemptId: string = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the login attempt
  const loginAttempt: IShoppingMallLoginAttempt =
    await api.functional.shoppingMall.admin.login_attempts.at(adminConnection, {
      loginAttemptId,
    });
  // 4. Validate the structure using typia.assert
  typia.assert(loginAttempt);
  // 5. Validate expected properties
  TestValidator.equals(
    "user_id should be string",
    loginAttempt.user_id,
    typeof loginAttempt.user_id,
  );
  TestValidator.equals(
    "ip_address should be string",
    loginAttempt.ip_address,
    typeof loginAttempt.ip_address,
  );
  TestValidator.equals(
    "attempt_timestamp should be string",
    loginAttempt.attempt_timestamp,
    typeof loginAttempt.attempt_timestamp,
  );
  TestValidator.equals(
    "success should be boolean",
    loginAttempt.success,
    loginAttempt.success,
  );
  TestValidator.equals(
    "failure_reason should be string or null",
    loginAttempt.failure_reason,
    typeof loginAttempt.failure_reason,
  );
  TestValidator.equals(
    "attempt_count should be number",
    loginAttempt.attempt_count,
    loginAttempt.attempt_count,
  );
  // 6. Confirm login attempt ID matches our query
  TestValidator.equals(
    "login attempt ID should match",
    loginAttempt.id,
    loginAttemptId,
  );
}