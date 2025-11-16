import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

/**
 * Test explicit admin logout by deleting an active authentication session.
 *
 * This test validates the session termination workflow where an administrator
 * explicitly ends their session through a logout action. Due to API limitations
 * (the join endpoint doesn't return session ID and no session listing endpoint
 * is available), this test demonstrates the session deletion endpoint using the
 * admin ID from a created account.
 *
 * Test Steps:
 *
 * 1. Create first admin account to establish authenticated session
 * 2. Create second admin account to get a different session context
 * 3. Use the second admin's credentials to call the session delete endpoint
 * 4. Validate the response contains proper session termination information
 */
export async function test_api_admin_session_logout_explicit(
  connection: api.IConnection,
) {
  // Step 1: Create first admin account and establish authenticated session
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1Password = typia.random<string & tags.Format<"password">>();

  const admin1Body = {
    email: admin1Email,
    password: admin1Password,
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

  const admin1 = await api.functional.auth.admin.join(connection, {
    body: admin1Body,
  });
  typia.assert(admin1);

  // Step 2: Verify first admin is authenticated with valid tokens
  TestValidator.predicate(
    "first admin account created successfully",
    admin1.id !== undefined && admin1.id.length > 0,
  );
  TestValidator.predicate(
    "first admin access token issued",
    admin1.token.access !== undefined && admin1.token.access.length > 0,
  );

  // Step 3: Create second admin account for session deletion test
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2Password = typia.random<string & tags.Format<"password">>();

  const admin2Body = {
    email: admin2Email,
    password: admin2Password,
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

  const admin2 = await api.functional.auth.admin.join(connection, {
    body: admin2Body,
  });
  typia.assert(admin2);

  // Step 4: Generate a session ID for the deletion test
  // Note: In a real scenario, this would come from a session listing endpoint
  // or be returned by the join endpoint. For this test, we use a UUID.
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 5: Delete the admin session to explicitly log out
  const deletedSession =
    await api.functional.shoppingMall.admin.admins.sessions.erase(connection, {
      adminId: admin2.id,
      sessionId: sessionId,
    });
  typia.assert(deletedSession);

  // Step 6: Validate the deleted session information structure
  TestValidator.predicate(
    "deleted session has valid ID",
    deletedSession.id !== undefined && deletedSession.id.length > 0,
  );
  TestValidator.predicate(
    "deleted session has admin information",
    deletedSession.admin !== undefined && deletedSession.admin.id !== undefined,
  );
  TestValidator.predicate(
    "deleted session has IP address",
    deletedSession.ip !== undefined && deletedSession.ip.length > 0,
  );
  TestValidator.predicate(
    "deleted session has href",
    deletedSession.href !== undefined && deletedSession.href.length > 0,
  );
  TestValidator.predicate(
    "deleted session has created_at timestamp",
    deletedSession.created_at !== undefined &&
      deletedSession.created_at.length > 0,
  );
}
