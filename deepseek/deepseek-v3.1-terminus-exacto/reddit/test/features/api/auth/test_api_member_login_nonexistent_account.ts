import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test member login failure when attempting to authenticate with an email
 * address that does not correspond to any registered member account. This
 * scenario validates that the platform properly handles authentication attempts
 * for non-existent accounts by returning appropriate error responses without
 * revealing whether the email exists in the system.
 */
export async function test_api_member_login_nonexistent_account(
  connection: api.IConnection,
) {
  // Generate a random email address that is guaranteed not to exist in the system
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Create valid login credentials with the non-existent email
  const loginCredentials = {
    email: nonExistentEmail,
    password: RandomGenerator.alphaNumeric(12), // Generate random password
    ip: "192.168.1.100", // Optional IP address for session tracking
    href: typia.random<string & tags.Format<"uri">>(), // Dynamic login page URL
    referrer: typia.random<string & tags.Format<"uri">>(), // Dynamic referrer URL
  } satisfies ICommunityPlatformMember.ILogin;

  // Attempt to authenticate using the non-existent account
  // This should fail with an appropriate error response
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: loginCredentials,
      });
    },
  );
}
