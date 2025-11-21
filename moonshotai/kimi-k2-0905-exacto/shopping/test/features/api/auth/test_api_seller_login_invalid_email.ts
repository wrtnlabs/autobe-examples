import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_login_invalid_email(
  connection: api.IConnection,
) {
  // Generate a random email that doesn't exist in the system
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Create login credentials with non-existent email
  const loginCredentials = {
    email: nonExistentEmail,
    password: "ValidPassword123!", // Valid password format for testing
  } satisfies IShoppingMallSeller.ILogin;

  // Test that login with non-existent email fails
  await TestValidator.error(
    "should fail login with non-existent email",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: loginCredentials,
      });
    },
  );
}
