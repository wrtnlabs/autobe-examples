import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test login failure with non-existent email address.
 *
 * Validates that the authentication system properly rejects login attempts when
 * the provided email address does not exist in the discussion_board_members
 * table. This test ensures proper security by verifying that:
 *
 * 1. Login fails when using a non-existent email address
 * 2. No authentication tokens are issued for invalid credentials
 * 3. The system maintains security by not revealing email existence
 *
 * The test generates a random email that doesn't exist in the system and
 * attempts authentication with it. The expected behavior is that the API should
 * reject the request with an appropriate error without disclosing whether the
 * email exists or not (preventing user enumeration attacks).
 */
export async function test_api_member_login_invalid_email(
  connection: api.IConnection,
) {
  // Generate a non-existent email address using random email format
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Create login request with non-existent email
  const loginRequest = {
    email: nonExistentEmail,
    password: "anyPassword123",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ILogin;

  // Attempt login with non-existent email should fail
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: loginRequest,
      });
    },
  );
}
