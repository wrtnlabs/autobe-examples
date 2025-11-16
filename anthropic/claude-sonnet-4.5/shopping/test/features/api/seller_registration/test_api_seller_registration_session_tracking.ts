import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller registration with session tracking information.
 *
 * This test validates that the seller registration endpoint properly captures
 * and records session tracking information including the connection URL (href),
 * referrer URL (previous page), and optional IP address. This session data is
 * essential for:
 *
 * - User journey analysis and marketing attribution
 * - Security monitoring and fraud detection
 * - Analytics on seller acquisition channels
 *
 * The test performs the following steps:
 *
 * 1. Generate realistic seller registration data
 * 2. Include session tracking information (href, referrer, optional IP)
 * 3. Call the seller registration API
 * 4. Verify successful registration with JWT tokens
 * 5. Validate seller account creation with correct data
 */
export async function test_api_seller_registration_session_tracking(
  connection: api.IConnection,
) {
  // Generate session tracking information
  const registrationPageUrl = typia.random<string & tags.Format<"uri">>();
  const referrerPageUrl = typia.random<string & tags.Format<"uri">>();
  const clientIpAddress = typia.random<string & tags.Format<"ipv4">>();

  // Generate seller registration data with session tracking
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("+82"),
    business_name: `${RandomGenerator.name(2)} Inc.`,
    business_description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    store_name: RandomGenerator.name(2),
    ip: clientIpAddress,
    href: registrationPageUrl,
    referrer: referrerPageUrl,
  } satisfies IShoppingMallSeller.ICreate;

  // Register new seller account with session tracking
  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: registrationData,
    });

  // Validate the response structure - this performs COMPLETE type validation
  typia.assert(authorizedSeller);

  // Verify seller account data matches registration input
  TestValidator.equals(
    "seller email matches",
    authorizedSeller.email,
    registrationData.email,
  );
  TestValidator.equals(
    "seller full name matches",
    authorizedSeller.full_name,
    registrationData.full_name,
  );
  TestValidator.equals(
    "seller phone number matches",
    authorizedSeller.phone_number,
    registrationData.phone_number,
  );
  TestValidator.equals(
    "seller business name matches",
    authorizedSeller.business_name,
    registrationData.business_name,
  );
  TestValidator.equals(
    "seller business description matches",
    authorizedSeller.business_description,
    registrationData.business_description,
  );
  TestValidator.equals(
    "seller store name matches",
    authorizedSeller.store_name,
    registrationData.store_name,
  );
}
