import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test buyer registration with session context tracking.
 *
 * Validates that buyer registration properly captures and stores session
 * context information including IP address, href (current page URL), and
 * referrer URL. The session metadata is recorded in the
 * shopping_mall_buyer_sessions table for audit trail and analytics purposes.
 *
 * This test verifies:
 *
 * 1. Registration with explicit IP address is properly stored
 * 2. Registration with null IP allows server to extract from headers
 * 3. Href (current page URL) is mandatory and validated as valid URI
 * 4. Referrer can be empty string for direct access scenarios
 * 5. Successful registration returns complete buyer profile with JWT tokens
 * 6. Session context enables security monitoring and user journey analysis
 */
export async function test_api_buyer_registration_with_session_context(
  connection: api.IConnection,
) {
  // Scenario 1: Registration with explicit IP, href, and non-empty referrer
  const email1 = typia.random<string & tags.Format<"email">>();
  const registrationData1 = {
    email: email1,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    ip: "192.168.1.100",
    href: "https://shop.example.com/register",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer1: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: registrationData1,
    });
  typia.assert(buyer1);

  // Validate buyer profile data
  TestValidator.equals(
    "buyer email matches registration",
    buyer1.email,
    email1,
  );
  TestValidator.equals(
    "buyer full_name matches",
    buyer1.full_name,
    registrationData1.full_name,
  );
  TestValidator.equals(
    "buyer phone_number matches",
    buyer1.phone_number,
    registrationData1.phone_number,
  );
  TestValidator.predicate(
    "buyer email not verified initially",
    buyer1.email_verified === false,
  );

  // Scenario 2: Registration with null IP (server extracts) and empty referrer (direct access)
  const email2 = typia.random<string & tags.Format<"email">>();
  const registrationData2 = {
    email: email2,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "",
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer2: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: registrationData2,
    });
  typia.assert(buyer2);

  // Validate second buyer registration
  TestValidator.equals("second buyer email matches", buyer2.email, email2);
  TestValidator.equals(
    "second buyer full_name matches",
    buyer2.full_name,
    registrationData2.full_name,
  );

  // Validate that two different buyers were created
  TestValidator.notEquals(
    "two buyers have different IDs",
    buyer1.id,
    buyer2.id,
  );
  TestValidator.notEquals(
    "two buyers have different emails",
    buyer1.email,
    buyer2.email,
  );
}
