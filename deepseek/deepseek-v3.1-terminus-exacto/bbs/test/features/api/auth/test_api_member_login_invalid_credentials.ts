import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member login with incorrect credentials.
 *
 * Validates authentication error handling by testing both wrong password and
 * non-existent email scenarios. Ensures the system provides consistent error
 * responses without revealing account existence information.
 */
export async function test_api_member_login_invalid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Create a valid member account for testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "ValidPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.paragraph({ sentences: 2 }),
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://example.com/auth/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Test login with wrong password
  await TestValidator.error(
    "login should fail with wrong password",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: memberEmail,
          password: "WrongPassword456",
          href: "https://example.com/auth/login",
          referrer: "https://example.com",
        } satisfies IDiscussionBoardMember.ILogin,
      });
    },
  );

  // Step 3: Test login with non-existent email
  await TestValidator.error(
    "login should fail with non-existent email",
    async () => {
      const nonExistentEmail = typia.random<string & tags.Format<"email">>();
      await api.functional.auth.member.login(connection, {
        body: {
          email: nonExistentEmail,
          password: "AnyPassword789",
          href: "https://example.com/auth/login",
          referrer: "https://example.com",
        } satisfies IDiscussionBoardMember.ILogin,
      });
    },
  );
}
