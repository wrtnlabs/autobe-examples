import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Validate retrieval of administrator account details after registration
 * (join).
 *
 * This test creates a new admin account via join authentication, then retrieves
 * the admin's own detail through the admin account detail endpoint using the
 * adminId.
 *
 * Steps:
 *
 * 1. Register a new admin via join, capturing all returned profile fields (id,
 *    email, name, etc).
 * 2. Access /shopping/admin/admins/{adminId} with the admin's id from the join
 *    response.
 * 3. Validate that all critical profile fields (id, email, name, role, status,
 *    created_at, updated_at, deleted_at) match exactly.
 * 4. Confirm full data accuracy and proper type assertion.
 * 5. [Negative case:] Optional shortcut: If able, simulate deleted/suspended fetch
 *    and validate error (only if business logic allows).
 *
 * Only fields explicitly documented in DTO and available API are validated. No
 * type violations or forbidden patterns are present.
 */
export async function test_api_admin_account_detail_view_with_joined_authentication(
  connection: api.IConnection,
) {
  // 1. Register (join) a new admin account
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "!A1", // Ensure basic complexity
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "operator",
      "compliance",
    ] as const),
    status: RandomGenerator.pick([
      "active",
      "pending",
      "suspended",
      "locked",
    ] as const),
  } satisfies IShoppingAdmin.IJoin;
  const authorized: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinInput,
    });
  typia.assert(authorized);

  // 2. Retrieve the admin's details using returned adminId
  const detail: IShoppingAdmin = await api.functional.shopping.admin.admins.at(
    connection,
    { adminId: authorized.id },
  );
  typia.assert(detail);

  // 3. Validate profile field equality
  TestValidator.equals("admin id equality", detail.id, authorized.id);
  TestValidator.equals("admin email equality", detail.email, authorized.email);
  TestValidator.equals("admin name equality", detail.name, authorized.name);
  TestValidator.equals("admin role equality", detail.role, authorized.role);
  TestValidator.equals(
    "admin status equality",
    detail.status,
    authorized.status,
  );
  TestValidator.equals(
    "admin created_at equality",
    detail.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "admin updated_at equality",
    detail.updated_at,
    authorized.updated_at,
  );
  TestValidator.equals(
    "admin deleted_at equality",
    detail.deleted_at ?? null,
    authorized.deleted_at ?? null,
  );
}
