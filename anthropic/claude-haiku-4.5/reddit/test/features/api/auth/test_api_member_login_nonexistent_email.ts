import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_member_login_nonexistent_email(
  connection: api.IConnection,
) {
  // Test member login with a non-existent email address
  // Verify that the system returns authentication failure without
  // revealing whether the email is registered (security best practice)

  const nonexistentEmail = typia.random<string & tags.Format<"email">>();
  const password = "ValidPassword123";

  // Attempt login with non-existent email
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: nonexistentEmail,
          password: password,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformMember.ILogin,
      });
    },
  );
}
