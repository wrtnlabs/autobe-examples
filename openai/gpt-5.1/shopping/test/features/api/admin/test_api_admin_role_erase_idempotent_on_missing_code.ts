import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";

export async function test_api_admin_role_erase_idempotent_on_missing_code(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain authenticated context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Choose a clearly non-existent role code
  const missingRoleCode =
    "nonexistent_erase_role_" + RandomGenerator.alphaNumeric(12);

  // Helper to call erase and wrap result or error in a tagged union
  const eraseOnce = async () => {
    try {
      const role: IShoppingMallAdminRole =
        await api.functional.shoppingMall.admin.adminRoles.erase(connection, {
          adminRoleCode: missingRoleCode,
        });
      typia.assert<IShoppingMallAdminRole>(role);
      return {
        kind: "success" as const,
        role,
      };
    } catch (error) {
      return {
        kind: "error" as const,
        error,
      };
    }
  };

  // 3. First erase attempt on non-existent code
  const first = await eraseOnce();

  // 4. Second erase attempt on the same code to validate idempotency
  const second = await eraseOnce();

  // 5. Validate consistent behavior between first and second attempts
  if (first.kind === "success" && second.kind === "success") {
    // Both behaved as idempotent success. Focus on consistency of responses
    // rather than enforcing a particular code echoing behavior.
    TestValidator.equals(
      "both erase successes should have consistent role code",
      first.role.code,
      second.role.code,
    );
  } else if (first.kind === "error" && second.kind === "error") {
    // Both attempts failed, which is also acceptable as consistent not-found
    // behavior. We do not assert specific HttpError status codes, only that
    // both attempts agree.
    TestValidator.predicate("both erase attempts failed consistently", true);
  } else {
    // Mixed behavior indicates non-idempotent or inconsistent API behavior;
    // surface this by failing the test.
    TestValidator.predicate(
      "erase must behave consistently across repeated calls",
      false,
    );
  }
}
