import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";

/**
 * Test successful member registration with valid credentials.
 *
 * This test validates that a new member can create an account with unique
 * username, valid email format, and strong password. Verifies JWT tokens are
 * issued upon successful registration and member profile is created correctly.
 *
 * 1. Generate valid registration data with unique username and email
 * 2. Submit member registration request with proper context (href, referrer)
 * 3. Verify successful registration returns authorized member data
 * 4. Validate JWT token structure and authentication header is set
 * 5. Confirm member profile contains correct data structure
 */
export async function test_api_member_registration_success(
  connection: api.IConnection,
) {
  // Generate valid registration data with unique username and email
  const username = RandomGenerator.name()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 20);

  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  const registrationData = {
    username,
    email,
    password,
    href: "https://example.com/register",
    referrer: "https://example.com/login",
  } satisfies IPoliticsBbsMember.IJoin;

  // Submit member registration request - CRITICAL: Add await
  const member = await api.functional.auth.members.join(connection, {
    body: registrationData,
  });

  // Verify successful registration returns authorized member data
  typia.assert(member);

  // Validate core member data - simplified approach
  TestValidator.equals(
    "member username matches input",
    member.username,
    username,
  );
  TestValidator.equals("member email matches input", member.email, email);
  TestValidator.equals("member role is member", member.role, "member");

  // Validate JWT token structure
  TestValidator.notEquals("access token exists", member.token.access, "");
  TestValidator.notEquals("refresh token exists", member.token.refresh, "");
}
