import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_login_invalid_email_not_found(
  connection: api.IConnection,
) {
  // Generate a non-existent email address
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Generate a valid password (minimum 8 characters as per ILogin.password constraint)
  const validPassword = RandomGenerator.alphaNumeric(12);

  // Generate required connection URLs
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Attempt to log in with non-existent email - should fail
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: nonExistentEmail,
          password: validPassword,
          href: href,
          referrer: referrer,
        } satisfies IDiscussionBoardMember.ILogin,
      });
    },
  );
}
