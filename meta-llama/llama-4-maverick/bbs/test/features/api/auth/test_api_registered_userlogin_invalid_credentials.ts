import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";

export async function test_api_registered_userlogin_invalid_credentials(
  connection: api.IConnection,
) {
  // Test login with valid email but wrong password
  const validEmail = typia.random<string & tags.Format<"email">>();
  const wrongPassword = "wrongpassword123";
  await TestValidator.error("wrong password should fail", async () => {
    await api.functional.auth.registered_user.login(connection, {
      body: validEmail + ":" + wrongPassword,
    });
  });

  // Test login with non-existent user
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const randomPassword = RandomGenerator.alphaNumeric(12);
  await TestValidator.error("non-existent user should fail", async () => {
    await api.functional.auth.registered_user.login(connection, {
      body: nonExistentEmail + ":" + randomPassword,
    });
  });
}
