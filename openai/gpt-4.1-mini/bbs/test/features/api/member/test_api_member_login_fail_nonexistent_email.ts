import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_login_fail_nonexistent_email(
  connection: api.IConnection,
) {
  // Prepare a login request with non-existent email
  const nonExistentEmail = `nonexistent_${RandomGenerator.alphaNumeric(10)}@example.com`;
  const loginRequest = {
    email: nonExistentEmail,
    password: "password123",
    ip: null, // optional, passing explicit null
    href: "https://example.com/login",
    referrer: "https://example.com/",
  } satisfies IDiscussionBoardMember.ILogin;

  // Attempt login and expect error due to non-existent email
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: loginRequest,
      });
    },
  );
}
