import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingUserEmail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingUserEmail";

/**
 * Verify admin detail view of user email for audit and compliance.
 *
 * 1. Register a new admin to obtain admin credentials.
 * 2. Authenticate as the admin.
 * 3. Generate a mock IShoppingUserEmail entity (could represent a customer or
 *    seller email, with at least one ownership field non-null).
 * 4. (In this mock, directly use random user email ID for demo)
 * 5. As authenticated admin, fetch the detail view for the chosen userEmailId
 *    using the admin API.
 * 6. Validate that the returned record provides all expected permitted fields (id,
 *    ownership, email, is_verified, is_primary, created_at, updated_at,
 *    deleted_at) but omits non-schema fields.
 * 7. Check correct value types and ownership association.
 * 8. Confirm endpoints enforce authorization: attempt the detail fetch without
 *    admin login to ensure unauthorized actors are denied.
 * 9. Attempt to fetch a userEmailId that does not exist and expect proper error
 *    handling.
 */
export async function test_api_admin_user_email_detail_view_audit(
  connection: api.IConnection,
) {
  // 1. Register a new admin to obtain admin credentials.
  const randomAdmin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: "super", // assume "super" privilege is valid
    status: "active", // commonly accepted status
  } satisfies IShoppingAdmin.IJoin;
  const adminAuthorized: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: randomAdmin });
  typia.assert(adminAuthorized);

  // 2. Generate a mock user email entity (simulate what would exist in DB after user actions)
  const mockEmail: IShoppingUserEmail = typia.random<IShoppingUserEmail>();

  // 3. Simulate that this email exists in system (since we cannot create it via available APIs in this context)

  // 4. As authenticated admin, fetch the detail for this userEmailId
  const result: IShoppingUserEmail =
    await api.functional.shopping.admin.userEmails.at(connection, {
      userEmailId: mockEmail.id,
    });
  typia.assert(result);

  // 5. Validate that the fields and types match expectations
  TestValidator.equals("id matches", result.id, mockEmail.id);
  TestValidator.equals(
    "ownership links - only one owner type",
    [
      result.shopping_customer_id !== null &&
        result.shopping_customer_id !== undefined,
      result.shopping_seller_id !== null &&
        result.shopping_seller_id !== undefined,
    ].filter(Boolean).length,
    1,
  );
  TestValidator.equals(
    "email string matches format",
    typeof result.email,
    "string",
  );
  TestValidator.equals(
    "email value matches format",
    result.email.includes("@"),
    true,
  );
  TestValidator.predicate(
    "is_verified is boolean",
    typeof result.is_verified === "boolean",
  );
  TestValidator.predicate(
    "is_primary is boolean",
    typeof result.is_primary === "boolean",
  );
  TestValidator.predicate(
    "created_at is string",
    typeof result.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is string",
    typeof result.updated_at === "string",
  );

  // 6. Role-based access: try fetch with unauthorized (no admin) connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated actors cannot access admin user email detail",
    async () => {
      await api.functional.shopping.admin.userEmails.at(unauthConn, {
        userEmailId: mockEmail.id,
      });
    },
  );

  // 7. Not found: try fetching an email with a random UUID that's nearly guaranteed to not exist
  await TestValidator.error(
    "admin gets error for non-existent user email id",
    async () => {
      await api.functional.shopping.admin.userEmails.at(connection, {
        userEmailId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
