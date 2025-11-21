import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator registration failure when providing an invalid moderator
 * level.
 *
 * This test validates that the registration operation properly rejects requests
 * with unsupported privilege levels, ensuring that only valid moderator levels
 * are accepted during account creation. The test intentionally provides an
 * invalid moderator level to verify the API's business logic validation.
 */
export async function test_api_moderator_registration_invalid_level(
  connection: api.IConnection,
) {
  // Generate valid moderator registration data with correct types
  const invalidModeratorData = {
    email: typia.random<string & tags.Format<"email">>(),
    display_name: RandomGenerator.name(),
    moderator_level: "invalid_level", // Intentionally invalid level
    is_active: true,
  } satisfies ICommunityPlatformModerator.ICreate;

  // Attempt to create moderator with invalid level - should fail
  await TestValidator.error(
    "moderator registration should fail with invalid level",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: invalidModeratorData,
      });
    },
  );
}
