import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IModerator";

export async function test_api_moderator_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account with test email first to establish duplicate condition
  const testEmail: string = typia.random<string & tags.Format<"email">>();
  const firstRegistration: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: testEmail satisfies IModerator.ICreate,
    });
  typia.assert(firstRegistration);

  // Step 2: Perform the duplicate registration attempt
  await TestValidator.error(
    "duplicate email registration should fail with 409 Conflict",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: testEmail satisfies IModerator.ICreate,
      });
    },
  );
}
