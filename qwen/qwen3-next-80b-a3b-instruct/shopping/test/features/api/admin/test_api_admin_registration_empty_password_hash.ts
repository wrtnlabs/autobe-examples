import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_registration_empty_password_hash(
  connection: api.IConnection,
) {
  // Test admin registration with empty password_hash
  // System should reject request with empty password string
  // Validate system returns 400 Bad Request as empty password_hash is invalid per security protocol

  await TestValidator.error(
    "admin registration should fail with empty password",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "", // Empty password string - violates security protocol
          first_name: RandomGenerator.name(),
          last_name: RandomGenerator.name(),
          role: "super_admin" as const,
        } satisfies IShoppingMallAdmin.ICreate,
      });
    },
  );
}
