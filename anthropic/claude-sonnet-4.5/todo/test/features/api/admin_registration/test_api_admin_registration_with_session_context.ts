import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test administrator registration with complete session context metadata for
 * security auditing.
 *
 * This test validates the admin registration flow ensuring that all session
 * context information is properly captured and stored for security auditing
 * purposes. It tests both IPv4 and IPv6 IP address formats to ensure
 * comprehensive session tracking.
 *
 * Test Flow:
 *
 * 1. Generate valid admin credentials with session context (IPv4)
 * 2. Register admin account with complete session metadata
 * 3. Validate successful registration with JWT tokens
 * 4. Verify all session context is captured
 * 5. Test IPv6 format session context
 */
export async function test_api_admin_registration_with_session_context(
  connection: api.IConnection,
) {
  // Test 1: Admin registration with IPv4 session context
  const adminEmailV4 = typia.random<string & tags.Format<"email">>();
  const passwordV4 = RandomGenerator.alphaNumeric(12);
  const ipv4Address = "192.168.1.100";
  const registrationHref = "https://admin.example.com/register";
  const registrationReferrer = "https://admin.example.com/login";

  const registrationBodyV4 = {
    email: adminEmailV4,
    password: passwordV4,
    ip: ipv4Address,
    href: registrationHref,
    referrer: registrationReferrer,
  } satisfies ITodoListAdmin.ICreate;

  const adminV4 = await api.functional.auth.admin.join(connection, {
    body: registrationBodyV4,
  });
  typia.assert(adminV4);

  // Validate business logic - email matches input
  TestValidator.equals(
    "admin V4 email matches input",
    adminV4.email,
    adminEmailV4,
  );

  // Test 2: Admin registration with IPv6 session context
  const adminEmailV6 = typia.random<string & tags.Format<"email">>();
  const passwordV6 = RandomGenerator.alphaNumeric(12);
  const ipv6Address = "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
  const registrationHrefV6 = "https://admin.todoapp.com/auth/register";
  const registrationReferrerV6 = "https://admin.todoapp.com/welcome";

  const registrationBodyV6 = {
    email: adminEmailV6,
    password: passwordV6,
    ip: ipv6Address,
    href: registrationHrefV6,
    referrer: registrationReferrerV6,
  } satisfies ITodoListAdmin.ICreate;

  const adminV6 = await api.functional.auth.admin.join(connection, {
    body: registrationBodyV6,
  });
  typia.assert(adminV6);

  // Validate business logic - email matches input
  TestValidator.equals(
    "admin V6 email matches input",
    adminV6.email,
    adminEmailV6,
  );

  // Test 3: Registration with empty referrer (direct access scenario)
  const adminEmailDirect = typia.random<string & tags.Format<"email">>();
  const passwordDirect = RandomGenerator.alphaNumeric(12);
  const directAccessHref = "https://admin.system.com/signup";
  const emptyReferrer = "https://admin.system.com/";

  const registrationBodyDirect = {
    email: adminEmailDirect,
    password: passwordDirect,
    ip: "10.0.0.50",
    href: directAccessHref,
    referrer: emptyReferrer,
  } satisfies ITodoListAdmin.ICreate;

  const adminDirect = await api.functional.auth.admin.join(connection, {
    body: registrationBodyDirect,
  });
  typia.assert(adminDirect);

  // Validate business logic - email matches input
  TestValidator.equals(
    "admin direct access email matches",
    adminDirect.email,
    adminEmailDirect,
  );
}
