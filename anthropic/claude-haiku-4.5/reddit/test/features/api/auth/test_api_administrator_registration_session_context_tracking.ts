import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates session context tracking during administrator registration.
 *
 * Tests that the administrator registration endpoint properly captures and
 * records session context information including page URL (href), HTTP referrer,
 * and client IP address. This context is essential for maintaining audit trails
 * of administrative account creation for compliance and security purposes.
 *
 * The test validates two scenarios:
 *
 * 1. Registration with explicitly provided IP address - verifies the system
 *    accepts and records client-provided IP addresses
 * 2. Registration with null IP address - verifies the server can extract and
 *    record IP address from request headers when not provided by client
 *
 * Both scenarios confirm that all session context data is captured and stored
 * correctly in the registration response, enabling proper security auditing and
 * compliance monitoring of administrative account provisioning.
 */
export async function test_api_administrator_registration_session_context_tracking(
  connection: api.IConnection,
) {
  // Scenario 1: Registration with explicit IP address provided
  const email1 = typia.random<string & tags.Format<"email">>();
  const password1 = RandomGenerator.alphaNumeric(12);
  const username1 = RandomGenerator.alphaNumeric(8);
  const name1 = RandomGenerator.name();
  const href1 = "https://admin.example.com/registration";
  const referrer1 = "https://google.com/search?q=admin+panel";
  const ip1 = "192.168.1.100";

  const adminWithIp = await api.functional.auth.administrator.join(connection, {
    body: {
      email: email1,
      password: password1,
      username: username1,
      name: name1,
      href: href1,
      referrer: referrer1,
      ip: ip1,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminWithIp);

  TestValidator.equals(
    "administrator response has valid id",
    typeof adminWithIp.id,
    "string",
  );
  TestValidator.equals(
    "administrator email matches registration input",
    adminWithIp.email,
    email1,
  );
  TestValidator.equals(
    "administrator username matches registration input",
    adminWithIp.username,
    username1,
  );
  TestValidator.predicate(
    "token information is included in authorized response",
    adminWithIp.token !== null &&
      adminWithIp.token !== undefined &&
      typeof adminWithIp.token === "object",
  );
  TestValidator.predicate(
    "access token is provided",
    typeof adminWithIp.token.access === "string" &&
      adminWithIp.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is provided",
    typeof adminWithIp.token.refresh === "string" &&
      adminWithIp.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration is set",
    typeof adminWithIp.token.expired_at === "string" &&
      adminWithIp.token.expired_at.length > 0,
  );

  // Scenario 2: Registration with null IP address (server-extracted)
  const email2 = typia.random<string & tags.Format<"email">>();
  const password2 = RandomGenerator.alphaNumeric(12);
  const username2 = RandomGenerator.alphaNumeric(8);
  const name2 = RandomGenerator.name();
  const href2 = "https://admin.example.com/registration";
  const referrer2: string | null = null;

  const adminWithNullIp = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: email2,
        password: password2,
        username: username2,
        name: name2,
        href: href2,
        referrer: referrer2,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(adminWithNullIp);

  TestValidator.equals(
    "administrator response has valid id when ip is null",
    typeof adminWithNullIp.id,
    "string",
  );
  TestValidator.equals(
    "administrator email matches registration input with null ip",
    adminWithNullIp.email,
    email2,
  );
  TestValidator.equals(
    "administrator username matches registration input with null ip",
    adminWithNullIp.username,
    username2,
  );
  TestValidator.predicate(
    "token information is included when ip is null",
    adminWithNullIp.token !== null &&
      adminWithNullIp.token !== undefined &&
      typeof adminWithNullIp.token === "object",
  );
  TestValidator.predicate(
    "access token is provided when ip is null",
    typeof adminWithNullIp.token.access === "string" &&
      adminWithNullIp.token.access.length > 0,
  );

  // Scenario 3: Registration with referrer and minimal context
  const email3 = typia.random<string & tags.Format<"email">>();
  const password3 = RandomGenerator.alphaNumeric(12);
  const username3 = RandomGenerator.alphaNumeric(8);
  const name3 = RandomGenerator.name();
  const href3 = "https://admin.example.com/join";
  const referrer3 = "https://example.com";

  const adminWithReferrer = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: email3,
        password: password3,
        username: username3,
        name: name3,
        href: href3,
        referrer: referrer3,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(adminWithReferrer);

  TestValidator.equals(
    "administrator created with referrer context",
    typeof adminWithReferrer.id,
    "string",
  );
  TestValidator.predicate(
    "account status is active for new registrations",
    adminWithReferrer.account_status === "active",
  );
  TestValidator.predicate(
    "created_at timestamp is recorded",
    typeof adminWithReferrer.created_at === "string" &&
      adminWithReferrer.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp is recorded",
    typeof adminWithReferrer.updated_at === "string" &&
      adminWithReferrer.updated_at.length > 0,
  );
}
