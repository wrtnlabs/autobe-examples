import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Generate duplicate email for testing
  const duplicateEmail: string = typia.random<string & tags.Format<"email">>();

  // First registration - should succeed
  const firstRegistration: ICommunityBBSModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: duplicateEmail satisfies ICommunityBBSModerator.ICreate,
    });
  typia.assert(firstRegistration);

  // Second registration with same email - should fail with error
  await TestValidator.error(
    "duplicate email registration should be rejected",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: duplicateEmail satisfies ICommunityBBSModerator.ICreate,
      });
    },
  );
}
