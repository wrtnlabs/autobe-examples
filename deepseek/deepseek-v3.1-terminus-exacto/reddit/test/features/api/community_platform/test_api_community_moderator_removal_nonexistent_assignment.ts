import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";

/**
 * Test moderator removal when the specified moderator assignment does not
 * exist.
 *
 * This test validates proper error handling and response when attempting to
 * remove a moderator that has not been assigned or has already been removed. It
 * ensures that the API correctly rejects invalid removal requests and maintains
 * system integrity by preventing operations on non-existent moderator
 * assignments.
 */
export async function test_api_community_moderator_removal_nonexistent_assignment(
  connection: api.IConnection,
) {
  // Create administrator account for authentication context
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Attempt to remove a non-existent moderator assignment
  await TestValidator.error(
    "should fail when removing non-existent moderator assignment",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderators.erase(
        connection,
        {
          communitySlug: RandomGenerator.alphaNumeric(10),
          moderatorId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
