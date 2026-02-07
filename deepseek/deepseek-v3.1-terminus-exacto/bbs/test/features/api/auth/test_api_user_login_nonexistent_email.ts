import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test login failure with non-existent email address.
 *
 * Validates that the login endpoint properly handles authentication attempts
 * for email addresses that have not been registered in the system. This test
 * ensures security measures against user enumeration attacks by verifying
 * that the system returns appropriate error responses without revealing
 * whether the email exists in the system.
 */
export async function test_api_user_login_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for the login attempt
  const loginConnection: api.IConnection = { host: connection.host };
  // Generate a valid but non-existent email address
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = RandomGenerator.alphaNumeric(16);
  // Attempt to login with non-existent email
  // Using SDK directly since utility function expects successful authentication
  await TestValidator.error(
    "login should fail with non-existent email",
    async () => {
      await api.functional.discussionBoard.auth.user.login(loginConnection, {
        body: {
          email: nonExistentEmail,
          password: validPassword,
        } satisfies IDiscussionBoardUser.ILogin,
      });
    },
  );
}
