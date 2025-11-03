import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Delete a status enum code as admin and validate deletion operation completes.
 *
 * Flow:
 *
 * 1. Register an admin account via /auth/admin/join.
 * 2. As the authenticated admin, attempt status enum deletion.
 * 3. Validate deletion proceeds with no error (no further validation possible).
 */
export async function test_api_status_enum_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role: RandomGenerator.pick([
          "super",
          "support",
          "compliance",
          "operator",
        ] as const),
        status: RandomGenerator.pick([
          "active",
          "pending",
          "suspended",
          "locked",
        ] as const),
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Prepare status enum domain and code to delete
  // Use random values. In real platform, avoid codes in live use.
  const enumDomain = RandomGenerator.pick([
    "order",
    "review",
    "payment",
  ] as const);
  const statusCode = RandomGenerator.alphaNumeric(10);

  // 3. Attempt deletion as admin
  await api.functional.shopping.admin.statusEnums.erase(connection, {
    enumDomain,
    statusCode,
  });

  // If not error, deletion is treated as successful for this E2E
}
