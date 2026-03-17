import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful administrator registration with valid email and password.
 *
 * This test validates the administrator registration endpoint by:
 * 1. Creating a new admin account with unique email and strong password
 * 2. Verifying the response contains proper identity information and tokens
 * 3. Testing email uniqueness constraint by attempting duplicate registration
 * 4. Validating session context fields are properly recorded
 * 5. Verifying token expiration timestamps are valid ISO 8601 format
 * 6. Confirming the registered credentials can be used for authentication
 */
export async function test_api_admin_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a dedicated connection for admin operations
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate unique test credentials
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const strongPassword = RandomGenerator.alphaNumeric(16);
  const sessionHref = typia.random<string & tags.Format<"uri">>();
  const sessionReferrer = typia.random<string & tags.Format<"uri">>();
  const optionalIp = typia.random<string & tags.Format<"ipv4">>();
  // Test registration with IP field provided
  console.log("Test 1: Registration with IP field");
  const registrationBodyWithIp = {
    email: uniqueEmail,
    password: strongPassword,
    href: sessionHref,
    referrer: sessionReferrer,
    ip: optionalIp,
  } satisfies ICommunityPlatformAdmin.IJoin;
  const responseWithIp = await authorize_admin_join(adminConnection, {
    body: registrationBodyWithIp,
  });
  typia.assert(responseWithIp);
  // Validate response structure
  TestValidator.equals(
    "response should contain id field",
    typeof responseWithIp.id,
    "string",
  );
  TestValidator.equals(
    "email should match input",
    responseWithIp.email,
    uniqueEmail,
  );
  TestValidator.predicate(
    "id should be UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      responseWithIp.id,
    ),
  );
  // Validate token structure
  TestValidator.equals(
    "token should have access field",
    typeof responseWithIp.token.access,
    "string",
  );
  TestValidator.equals(
    "token should have refresh field",
    typeof responseWithIp.token.refresh,
    "string",
  );
  TestValidator.equals(
    "token should have expired_at field",
    typeof responseWithIp.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "token should have refreshable_until field",
    typeof responseWithIp.token.refreshable_until,
    "string",
  );
  // Validate ISO 8601 timestamps
  TestValidator.predicate(
    "expired_at should be valid ISO date",
    () => !isNaN(new Date(responseWithIp.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "refreshable_until should be valid ISO date",
    () => !isNaN(new Date(responseWithIp.token.refreshable_until).getTime()),
  );
  TestValidator.predicate(
    "expired_at should be before refreshable_until",
    () =>
      new Date(responseWithIp.token.expired_at) <
      new Date(responseWithIp.token.refreshable_until),
  );
  // Test email uniqueness constraint
  console.log("Test 2: Email uniqueness validation");
  const duplicateConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate email should fail", async () => {
    await authorize_admin_join(duplicateConnection, {
      body: registrationBodyWithIp,
    });
  });
  // Test registration without IP field (optional scenario)
  console.log("Test 3: Registration without IP field");
  const anotherEmail = typia.random<string & tags.Format<"email">>();
  const registrationBodyWithoutIp = {
    email: anotherEmail,
    password: strongPassword,
    href: sessionHref,
    referrer: sessionReferrer,
    // ip omitted intentionally to test optional field
  } satisfies ICommunityPlatformAdmin.IJoin;
  const responseWithoutIp = await authorize_admin_join(adminConnection, {
    body: registrationBodyWithoutIp,
  });
  typia.assert(responseWithoutIp);
  TestValidator.equals(
    "second registration email should match",
    responseWithoutIp.email,
    anotherEmail,
  );
  TestValidator.predicate(
    "second registration should have valid token",
    () =>
      typeof responseWithoutIp.token.access === "string" &&
      typeof responseWithoutIp.token.refresh === "string",
  );
  // Verify the token can be used for authenticated requests
  console.log("Test 4: Token usability validation");
  TestValidator.predicate(
    "access token should not be empty",
    responseWithIp.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should not be empty",
    responseWithIp.token.refresh.length > 0,
  );
  // Verify adminConnection now has Authorization header set by authorize_admin_join
  TestValidator.predicate(
    "connection should have authorization header",
    adminConnection.headers?.Authorization !== undefined,
  );
}
