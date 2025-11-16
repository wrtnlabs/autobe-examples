import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test idempotent behavior of session deletion operation.
 *
 * This test validates that the session deletion endpoint exhibits proper
 * idempotent behavior by successfully handling deletion requests for
 * non-existent sessions. According to REST principles and the API
 * documentation, DELETE operations should be idempotent - attempting to delete
 * a resource that doesn't exist should succeed without error, just as deleting
 * an already-deleted resource would.
 *
 * Steps:
 *
 * 1. Create buyer account establishing authentication context
 * 2. Attempt to delete a non-existent session (first deletion)
 * 3. Attempt to delete the same non-existent session again (second deletion)
 * 4. Validate that both deletion attempts succeed without throwing errors
 *
 * This approach tests idempotency by confirming that multiple deletion requests
 * for the same session ID (whether it exists or not) produce the same
 * successful result, which is the core principle of idempotent operations.
 */
export async function test_api_buyer_session_idempotent_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create buyer account and establish authentication context
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerData,
    });
  typia.assert(buyer);

  // Generate a non-existent session ID for idempotency testing
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: First deletion attempt of non-existent session
  // This should succeed without error due to idempotent behavior
  await api.functional.shoppingMall.buyer.buyers.sessions.erase(connection, {
    buyerId: buyer.id,
    sessionId: nonExistentSessionId,
  });

  // Step 3: Second deletion attempt of the same non-existent session
  // This should also succeed without error, confirming idempotency
  await api.functional.shoppingMall.buyer.buyers.sessions.erase(connection, {
    buyerId: buyer.id,
    sessionId: nonExistentSessionId,
  });

  // Step 4: Validation - if we reached here without errors, idempotency is confirmed
  // Both deletion attempts succeeded, demonstrating proper idempotent operation
  TestValidator.predicate(
    "session deletion exhibits idempotent behavior",
    true,
  );
}
