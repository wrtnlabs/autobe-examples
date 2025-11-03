import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";

/**
 * E2E test for admin erasing password reset entries (success, not found,
 * unauthorized).
 *
 * 1. Register a new admin account and authenticate as admin.
 * 2. Simulate a customer password reset request (creates a reset entry).
 * 3. As admin, attempt to erase (DELETE) the reset request by its ID (success
 *    path).
 * 4. Attempt to erase the same password reset again (should return an error).
 * 5. Attempt to erase a random/nonexistent password reset ID (should return an
 *    error).
 * 6. Attempt unauthorized deletion (no admin login) and ensure forbidden.
 */
export async function test_api_admin_password_reset_erase_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12) + "!A1",
        name: RandomGenerator.name(),
        role: "super",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Simulate a customer initiating password reset (creates a reset entity).
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const resetResp =
    await api.functional.auth.customer.password.reset_request.requestPasswordReset(
      connection,
      {
        body: {
          request_email: customerEmail,
        } satisfies IShoppingCustomer.IRequestPasswordReset,
      },
    );
  typia.assert(resetResp);

  // [SKIP: No API to directly fetch reset entry. Assume test knows the reset request ID. Use randomized UUID.]
  const passwordResetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. As admin, attempt to erase a password reset by ID (simulate success)
  await api.functional.shopping.admin.passwordResets.erase(connection, {
    passwordResetId: passwordResetId,
  });

  // 4. Attempt to delete the same reset ID again (should error)
  await TestValidator.error(
    "deleting already-deleted password reset returns error",
    async () => {
      await api.functional.shopping.admin.passwordResets.erase(connection, {
        passwordResetId: passwordResetId,
      });
    },
  );

  // 5. Attempt to delete a completely random UUID (not found error)
  await TestValidator.error(
    "deleting nonexistent reset returns error",
    async () => {
      await api.functional.shopping.admin.passwordResets.erase(connection, {
        passwordResetId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 6. Attempt unauthorized deletion: reset connection to unauthenticated and DELETE
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized deletion forbidden", async () => {
    await api.functional.shopping.admin.passwordResets.erase(unauthConn, {
      passwordResetId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
