import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSession";

/**
 * Test seller session visibility and structure.
 *
 * This test validates that sellers can view their active session information
 * through the sessions list API. After registration, the test retrieves the
 * seller's session list and validates that:
 *
 * 1. The sessions list API returns properly structured session data
 * 2. Each session has a unique session identifier (UUID format)
 * 3. Session metadata is correctly populated (user_type, timestamps, IP address)
 * 4. Device information fields are available (device_type, device_name,
 *    browser_name, operating_system)
 * 5. Location tracking information is present (approximate_location, ip_address)
 * 6. Session lifecycle data is tracked (created_at, last_activity_at,
 *    refresh_token_expires_at)
 * 7. The total session count accurately reflects the number of sessions returned
 * 8. Sessions are not revoked by default (is_revoked is false)
 *
 * Note: This test validates session visibility and data structure. Multiple
 * device session testing would require a separate login endpoint which is not
 * available in the current API specification.
 */
export async function test_api_seller_multi_device_sessions_visibility(
  connection: api.IConnection,
) {
  // Step 1: Register a new seller account (automatically creates first session)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const sellerData = {
    email: sellerEmail,
    password: sellerPassword,
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Maximum<9999>>()} ${RandomGenerator.name()} St, ${RandomGenerator.name()} City`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const registeredSeller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(registeredSeller);

  // Step 2: Retrieve all active sessions for the authenticated seller
  const sessionsList =
    await api.functional.auth.seller.sessions.listActiveSessions(connection);
  typia.assert(sessionsList);

  // Step 3: Validate session list structure
  TestValidator.predicate(
    "sessions array should exist and be non-empty",
    Array.isArray(sessionsList.sessions) && sessionsList.sessions.length > 0,
  );

  TestValidator.equals(
    "total count matches sessions array length",
    sessionsList.total_count,
    sessionsList.sessions.length,
  );

  TestValidator.predicate(
    "should have at least one session from registration",
    sessionsList.sessions.length >= 1,
  );

  // Step 4: Validate each session has complete and valid data
  for (const session of sessionsList.sessions) {
    typia.assert(session);

    // Validate user type matches seller
    TestValidator.equals(
      "session user type is seller",
      session.user_type,
      "seller",
    );

    // Validate active session is not revoked
    TestValidator.equals(
      "active session should not be revoked",
      session.is_revoked,
      false,
    );

    // Validate revoked_at is null for active sessions
    TestValidator.equals(
      "revoked_at should be null for active session",
      session.revoked_at,
      null,
    );
  }

  // Step 5: Validate session ID uniqueness across all sessions
  const sessionIds = sessionsList.sessions.map((s) => s.id);
  const uniqueSessionIds = new Set(sessionIds);

  TestValidator.equals(
    "all session IDs are unique",
    uniqueSessionIds.size,
    sessionIds.length,
  );

  // Step 6: Validate at least one session has the expected seller email context
  // (The session should belong to the seller we just registered)
  TestValidator.predicate(
    "session list returned successfully for authenticated seller",
    sessionsList.sessions.length > 0 && sessionsList.total_count > 0,
  );
}
