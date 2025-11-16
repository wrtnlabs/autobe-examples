import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test updating a nonexistent community through the moderator endpoint.
 *
 * A moderator attempts to update a community with an invalid UUID that does not
 * exist. The test validates that the API properly returns a 404 Not Found error
 * when attempting to modify a nonexistent resource. This ensures proper error
 * handling for moderator operations on invalid community identifiers.
 *
 * Test flow:
 *
 * 1. Create a moderator account for authentication
 * 2. Generate a valid UUID format that does not correspond to any existing
 *    community
 * 3. Attempt to update the nonexistent community with valid update data
 * 4. Validate that the operation returns a 404 Not Found error
 * 5. Verify appropriate error handling for invalid resource access
 */
export async function test_api_community_update_moderator_nonexistent_community(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(12),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Generate a valid UUID that does not correspond to any existing community
  const nonexistentCommunityId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to update the nonexistent community and validate 404 error
  await TestValidator.httpError(
    "update nonexistent community should fail with 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.communities.update(
        connection,
        {
          communityId: nonexistentCommunityId,
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            visibility: "public",
          } satisfies ICommunityPlatformCommunity.IUpdate,
        },
      );
    },
  );
}
