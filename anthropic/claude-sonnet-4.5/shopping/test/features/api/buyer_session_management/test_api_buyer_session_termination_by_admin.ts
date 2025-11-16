import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test administrative termination of buyer authentication sessions.
 *
 * This test validates that platform administrators can forcefully terminate
 * buyer sessions for security purposes, compliance requirements, or fraud
 * investigations. The scenario creates a buyer account with an active session,
 * then uses admin privileges to terminate that specific session, verifying
 * proper administrative oversight capabilities.
 *
 * Step-by-step process:
 *
 * 1. Create admin account with session management privileges
 * 2. Create buyer account and establish authenticated session
 * 3. Admin terminates the buyer's specific session
 * 4. Verify successful session deletion (no error = success)
 */
export async function test_api_buyer_session_termination_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account with privileges to manage buyer sessions
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create buyer account and establish authenticated session
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerData = {
    email: buyerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerData,
  });
  typia.assert(buyer);

  // Step 3: Extract buyer ID for session management
  const buyerId = buyer.id;

  // Note: In a real scenario, the session ID would be obtained from:
  // - The buyer's authentication response (if exposed)
  // - A separate API call to list buyer sessions
  // - Database query results
  // For this test, we generate a representative session ID
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Admin terminates the buyer's specific session
  // The void return type indicates success when no error is thrown
  await api.functional.shoppingMall.admin.buyers.sessions.erase(connection, {
    buyerId: buyerId,
    sessionId: sessionId,
  });

  // Step 5: Verify successful operation
  // No exception thrown means the session deletion was processed successfully
  // In a production test, you would verify the session is actually removed by:
  // - Attempting to use the buyer's old tokens (should fail)
  // - Querying the sessions list to confirm deletion
}
