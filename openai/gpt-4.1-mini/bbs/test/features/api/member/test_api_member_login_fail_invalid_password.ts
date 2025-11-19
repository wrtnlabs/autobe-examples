import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_login_fail_invalid_password(
  connection: api.IConnection,
) {
  // 1. Create a new member account with valid data
  const email: string = typia.random<string & tags.Format<"email">>();
  const password = "StrongPassword123!";
  const nickname = RandomGenerator.name();

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password,
        nickname,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Attempt to login with the correct email but incorrect password
  await TestValidator.error(
    "login should fail with invalid password",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email,
          password: "WrongPassword456!",
          ip: null,
          href: "https://localhost/auth/login",
          referrer: "https://localhost/",
        } satisfies IDiscussionBoardMember.ILogin,
      });
    },
  );
}
