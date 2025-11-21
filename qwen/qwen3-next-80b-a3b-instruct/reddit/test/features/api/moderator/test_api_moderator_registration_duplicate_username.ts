import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_registration_duplicate_username(
  connection: api.IConnection,
) {
  // Generate a unique moderator username for the first registration
  const uniqueUsername = RandomGenerator.alphaNumeric(12);

  // First registration: Create a new moderator with unique username
  const firstRegistration: ICommunityBBSModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: uniqueUsername,
    });
  typia.assert(firstRegistration);

  // Second registration attempt: Attempt to register with the same username (should fail)
  await TestValidator.error(
    "duplicate username registration should fail",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: uniqueUsername, // Same username as first registration
      });
    },
  );
}
