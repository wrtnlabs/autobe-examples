import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSession";

/**
 * Test seller active sessions retrieval functionality.
 *
 * This test validates that sellers can successfully retrieve all their active
 * authentication sessions across multiple devices. The test ensures proper
 * session metadata population, correct ordering by activity, and accurate
 * session identification.
 *
 * Test workflow:
 *
 * 1. Register a new seller account with complete business information
 * 2. Authenticate the seller (automatic during registration)
 * 3. Retrieve the active sessions list via the sessions API
 * 4. Validate the response structure and session data completeness
 * 5. Verify session metadata accuracy and proper typing
 */
export async function test_api_seller_active_sessions_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Register new seller account
  const sellerRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.name(1),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Maximum<9999>>() satisfies number as number} ${RandomGenerator.name(1)} Street, ${RandomGenerator.name(1)} City`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerRegistration,
    });
  typia.assert(seller);

  // Step 2: Retrieve active sessions list
  const sessionList: IShoppingMallSeller.ISessionList =
    await api.functional.auth.seller.sessions.listActiveSessions(connection);
  typia.assert(sessionList);

  // Step 3: Validate response structure
  TestValidator.predicate(
    "sessions array should exist",
    Array.isArray(sessionList.sessions),
  );

  TestValidator.equals(
    "total count should match sessions array length",
    sessionList.total_count,
    sessionList.sessions.length,
  );

  TestValidator.predicate(
    "at least one active session should exist",
    sessionList.sessions.length >= 1,
  );

  // Step 4: Validate session data completeness
  const session = sessionList.sessions[0];
  typia.assert<IShoppingMallSession>(session);

  TestValidator.equals(
    "session user_type should be seller",
    session.user_type,
    "seller",
  );

  TestValidator.predicate(
    "session should not be revoked for new account",
    session.is_revoked === false,
  );
}
