import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

/**
 * Test retrieval of detailed guest session information by an authenticated
 * admin user.
 *
 * This test covers the entire workflow:
 *
 * 1. Admin user signs up (join) with realistic data to obtain authentication
 *    token.
 * 2. Create a guest session with valid session_token, IP address and user_agent.
 * 3. Admin user fetches detailed information of the created guest session by ID.
 * 4. Validations include presence and correctness of session token, IP, user
 *    agent, timestamps.
 * 5. Unauthorized access attempts are implicitly protected by requiring admin
 *    authentication.
 */
export async function test_api_guest_session_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin user registration
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("010"),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // Step 2: Create a guest session
  const guestBody = {
    session_token: RandomGenerator.alphaNumeric(16),
    ip_address: "192.168.0.1",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  } satisfies IShoppingMallGuest.ICreate;

  const guest: IShoppingMallGuest =
    await api.functional.shoppingMall.guests.create(connection, {
      body: guestBody,
    });
  typia.assert(guest);

  // Step 3: Admin retrieves detailed guest session info by guest ID
  const fetchedGuest: IShoppingMallGuest =
    await api.functional.shoppingMall.admin.guests.at(connection, {
      id: guest.id,
    });
  typia.assert(fetchedGuest);

  // Step 4: Validate each property
  TestValidator.equals("guest ID matches", fetchedGuest.id, guest.id);
  TestValidator.equals(
    "session token matches",
    fetchedGuest.session_token,
    guest.session_token,
  );
  TestValidator.equals(
    "IP address matches",
    fetchedGuest.ip_address,
    guest.ip_address,
  );
  TestValidator.equals(
    "user agent matches",
    fetchedGuest.user_agent,
    guest.user_agent,
  );

  // Timestamps are ISO date-time strings, ensure they are defined and valid
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    typeof fetchedGuest.created_at === "string" &&
      !isNaN(Date.parse(fetchedGuest.created_at)),
  );

  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    typeof fetchedGuest.updated_at === "string" &&
      !isNaN(Date.parse(fetchedGuest.updated_at)),
  );

  // deleted_at should be explicitly null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined",
    fetchedGuest.deleted_at === null || fetchedGuest.deleted_at === undefined,
  );
}
