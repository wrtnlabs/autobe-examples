import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_password_reset_verification_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // Step 2: Create verification request with valid new password
  // Password meets requirements: min 8 chars, uppercase, lowercase, numeric
  const newPassword = "NewPass123";
  const verifyBody = {
    token: typia.random<string>(),
    newPassword,
  } satisfies IShoppingMallCustomerPasswordReset.IVerify;
  // Step 3: Call password reset verification endpoint
  const result =
    await api.functional.shoppingMall.administrator.password_resets.verify(
      adminConnection,
      { body: verifyBody },
    );
  typia.assert(result);
  // Step 4: Validate response contains valid role
  TestValidator.predicate(
    "role is valid type",
    result.role === "customer" ||
      result.role === "seller" ||
      result.role === "administrator",
  );
  // Step 5: Verify that the reset token cannot be reused
  await TestValidator.error("token reuse should fail", async () => {
    await api.functional.shoppingMall.administrator.password_resets.verify(
      adminConnection,
      { body: verifyBody },
    );
  });
}
