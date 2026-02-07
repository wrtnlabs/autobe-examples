import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_registration_password_validation(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  // Test password validation failures
  const weakPasswords = [
    { password: "short", reason: "too short (less than 8 characters)" },
    { password: "nouppercase1!", reason: "missing uppercase letter" },
    { password: "NOLOWERCASE1!", reason: "missing lowercase letter" },
    { password: "NoNumbers!", reason: "missing number" },
    { password: "NoSpecial123", reason: "missing special character" },
  ];
  // Test each weak password
  for (const weakPassword of weakPasswords) {
    await TestValidator.error(
      `should reject weak password (${weakPassword.reason})`,
      async () => {
        await api.functional.shoppingMall.auth.super_admin.join(
          adminConnection,
          {
            body: {
              email: typia.random<string & tags.Format<"email">>(),
              password: weakPassword.password,
              name: RandomGenerator.name(),
            } satisfies IShoppingMallSuperAdmin.IJoin,
          },
        );
      },
    );
  }
  // Test successful registration with strong password
  const strongPassword = "SecurePass123!";
  const successfulEmail = typia.random<string & tags.Format<"email">>();
  const result = await api.functional.shoppingMall.auth.super_admin.join(
    adminConnection,
    {
      body: {
        email: successfulEmail,
        password: strongPassword,
        name: RandomGenerator.name(),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    },
  );
  typia.assert(result);
  // Verify registration was successful by checking token exists
  TestValidator.predicate(
    "successful registration returns token",
    () =>
      result.token.access !== undefined && result.token.refresh !== undefined,
  );
}
