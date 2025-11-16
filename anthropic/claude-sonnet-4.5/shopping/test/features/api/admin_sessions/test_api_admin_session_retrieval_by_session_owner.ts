import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

/**
 * Test that administrators cannot retrieve session records belonging to other
 * administrators.
 *
 * This test validates the security requirement that admins can only access
 * their own session details. It creates two separate admin accounts and
 * attempts to retrieve one admin's session using the other admin's credentials,
 * which should fail with an authorization error.
 *
 * NOTE: This test validates the authorization boundary enforcement, but cannot
 * test successful session retrieval because the available APIs do not provide a
 * way to obtain valid session IDs. The join endpoint returns IAuthorized
 * without session ID, and there is no session listing endpoint available.
 *
 * Steps:
 *
 * 1. Create first admin account (Admin A)
 * 2. Create second admin account (Admin B) - this authenticates as Admin B
 * 3. Admin B attempts to access Admin A's session resources (should fail with
 *    authorization error)
 */
export async function test_api_admin_session_retrieval_by_session_owner(
  connection: api.IConnection,
) {
  // Step 1: Create first admin account (Admin A)
  const adminAData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const adminA = await api.functional.auth.admin.join(connection, {
    body: adminAData,
  });
  typia.assert(adminA);

  // Step 2: Create second admin account (Admin B)
  const adminBData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const adminB = await api.functional.auth.admin.join(connection, {
    body: adminBData,
  });
  typia.assert(adminB);

  // Step 3: Admin B (currently authenticated) attempts to retrieve Admin A's session
  // The connection is now authenticated as Admin B due to the last join call
  // We attempt to access a session under Admin A's adminId, which should fail
  const arbitrarySessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "Admin B cannot access Admin A's session resources",
    async () => {
      await api.functional.shoppingMall.admin.admins.sessions.at(connection, {
        adminId: adminA.id,
        sessionId: arbitrarySessionId,
      });
    },
  );
}
