import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_registration_with_short_password(
  connection: api.IConnection,
) {
  /**
   * Test that moderator registration rejects passwords shorter than 8
   * characters.
   *
   * The registration endpoint validates password strength by enforcing a
   * minimum length of 8 characters. This test verifies that the endpoint
   * properly rejects registration attempts with weak passwords that don't meet
   * this requirement.
   *
   * Steps:
   *
   * 1. Prepare registration data with a short password (less than 8 characters)
   * 2. Attempt to register as a moderator with the weak password
   * 3. Verify that the endpoint returns a validation error
   * 4. Confirm that no account is created with invalid credentials
   */

  const shortPassword = "pass1"; // 5 characters - violates MinLength<8> constraint

  await TestValidator.error(
    "moderator registration should reject password shorter than 8 characters",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: RandomGenerator.name(1),
          password: shortPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformModerator.ICreate,
      });
    },
  );
}
