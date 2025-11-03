import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_login_invalid_email(
  connection: api.IConnection,
) {
  /**
   * Validate moderator login rejection with unregistered email. This test
   * ensures the login endpoint properly returns an error when provided with an
   * email that does not exist in the discussion_board_moderators table. The
   * endpoint should reject the login attempt without revealing whether the
   * email or password was incorrect, preventing email enumeration attacks.
   */

  // Generate a random unregistered email address that is guaranteed not to exist in the system
  const unregisteredEmail = typia.random<string & tags.Format<"email">>();
  const password = "ValidPassword123";

  // Prepare login request with non-existent email
  const loginRequest = {
    email: unregisteredEmail,
    password: password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ILogin;

  // Attempt to login with unregistered email - should fail
  await TestValidator.error(
    "moderator login should fail with unregistered email",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: loginRequest,
      });
    },
  );
}
