import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPasswordReset";

export async function test_api_password_reset_missing_email(
  connection: IConnection,
) {
  // Test complete password reset request body (should succeed)
  const requestBody1 = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/reset-password",
    referrer: "https://example.com/login",
  } satisfies IShoppingMallPasswordReset.ICreate;

  const response1 =
    await api.functional.shoppingMall.auth.password.reset.requestReset(
      connection,
      {
        body: requestBody1,
      },
    );
  typia.assert(response1);

  TestValidator.equals(
    "should succeed with valid request",
    response1.email,
    requestBody1.email,
  );

  // Test missing required field (should fail)
  await TestValidator.error("should fail when email is missing", async () => {
    await api.functional.shoppingMall.auth.password.reset.requestReset(
      connection,
      {
        body: {
          href: "https://example.com/reset-password",
          referrer: "https://example.com/login",
        } as IShoppingMallPasswordReset.ICreate, // TypeScript will validate this
      },
    );
  });
}
