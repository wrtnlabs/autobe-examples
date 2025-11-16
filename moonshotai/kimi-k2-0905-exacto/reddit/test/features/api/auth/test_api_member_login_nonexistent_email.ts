import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test member login failure with non-existent email to validate security
 * against email enumeration
 */
export async function test_api_member_login_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a random non-existent email address
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Create valid login request with non-existent email
  const loginRequest = {
    email: nonExistentEmail,
    password: "ValidPassword123!",
    href: "https://reddit-community.com/login",
    referrer: "https://reddit-community.com/",
  } satisfies IRedditCommunityMember.ILoginRequest;

  // Attempt login with non-existent email and verify it fails
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: loginRequest,
      });
    },
  );
}
