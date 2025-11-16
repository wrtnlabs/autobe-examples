import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_administrator_login_nonexistent_email(
  connection: api.IConnection,
) {
  /**
   * Test administrator login with a non-existent email address.
   *
   * Validates that the login endpoint rejects authentication attempts with
   * email addresses that do not correspond to any registered administrator
   * account. The API should return an error response without revealing whether
   * the email exists, preventing email enumeration vulnerabilities.
   */

  // Generate a non-existent administrator email
  const nonexistentEmail = typia.random<string & tags.Format<"email">>();
  const password = "validPassword123";

  // Attempt to login with non-existent email
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.administrator.login(connection, {
        body: {
          email: nonexistentEmail,
          password: password,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: RandomGenerator.substring(RandomGenerator.content()),
        } satisfies ICommunityPlatformAdministrator.ILogin,
      });
    },
  );
}
