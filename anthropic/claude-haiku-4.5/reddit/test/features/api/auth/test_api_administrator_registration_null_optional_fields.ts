import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates administrator registration with optional fields explicitly set to
 * null.
 *
 * Tests that the administrator registration endpoint properly handles null
 * values for optional session context fields (referrer and ip). The
 * registration should succeed when these optional fields are null, ensuring the
 * system gracefully handles missing or explicitly unset optional parameters.
 *
 * Test steps:
 *
 * 1. Generate valid administrator registration data with required fields
 * 2. Explicitly set optional fields (referrer, ip) to null
 * 3. Call administrator registration API with null optional fields
 * 4. Validate successful registration response with correct structure
 * 5. Test with referrer explicitly null
 * 6. Test with ip explicitly null
 * 7. Test with both optional fields explicitly null
 * 8. Confirm all registrations succeed with proper JWT tokens issued
 */
export async function test_api_administrator_registration_null_optional_fields(
  connection: api.IConnection,
) {
  // Test 1: Registration with both optional fields explicitly null
  const email1 = typia.random<string & tags.Format<"email">>();
  const response1 = await api.functional.auth.administrator.join(connection, {
    body: {
      email: email1,
      password: RandomGenerator.alphabets(8),
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: null,
      ip: null,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(response1);
  TestValidator.equals(
    "administrator registration with both null optional fields should succeed",
    response1.email,
    email1,
  );
  TestValidator.predicate(
    "response should contain valid access token",
    response1.token.access.length > 0,
  );
  TestValidator.predicate(
    "response should contain valid refresh token",
    response1.token.refresh.length > 0,
  );

  // Test 2: Registration with referrer explicitly null, ip omitted
  const email2 = typia.random<string & tags.Format<"email">>();
  const response2 = await api.functional.auth.administrator.join(connection, {
    body: {
      email: email2,
      password: RandomGenerator.alphabets(8),
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: null,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(response2);
  TestValidator.equals(
    "administrator registration with null referrer should succeed",
    response2.email,
    email2,
  );
  TestValidator.predicate(
    "account should be active after registration with null referrer",
    response2.account_status === "active",
  );

  // Test 3: Registration with ip explicitly null, referrer omitted
  const email3 = typia.random<string & tags.Format<"email">>();
  const response3 = await api.functional.auth.administrator.join(connection, {
    body: {
      email: email3,
      password: RandomGenerator.alphabets(8),
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(response3);
  TestValidator.equals(
    "administrator registration with null ip should succeed",
    response3.email,
    email3,
  );
  TestValidator.predicate(
    "administrator account should be active",
    response3.account_status === "active",
  );

  // Test 4: Registration with both optional fields omitted (not provided)
  const email4 = typia.random<string & tags.Format<"email">>();
  const response4 = await api.functional.auth.administrator.join(connection, {
    body: {
      email: email4,
      password: RandomGenerator.alphabets(8),
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(response4);
  TestValidator.equals(
    "administrator registration without optional fields should succeed",
    response4.email,
    email4,
  );
  TestValidator.predicate(
    "account status should be active for new registration",
    response4.account_status === "active",
  );
  TestValidator.predicate(
    "email should not be verified initially",
    response4.email_verified === false,
  );
}
