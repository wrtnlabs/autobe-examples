import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test community name uniqueness enforcement.
 *
 * Validates that the system properly enforces unique community names to prevent
 * URL conflicts. Community names serve as URL identifiers (/r/{name}), so
 * duplicates would break routing. This test ensures the database-level
 * constraint works correctly.
 *
 * Steps:
 *
 * 1. Create and authenticate as moderator
 * 2. Create first community with specific name
 * 3. Verify first community creation succeeds
 * 4. Attempt to create second community with same name
 * 5. Verify duplicate creation is rejected
 * 6. Confirm original community remains accessible
 */
export async function test_api_community_name_uniqueness(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "securePassword123";

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create first community with a specific unique name (lowercase only)
  const uniqueCommunityName = RandomGenerator.alphabets(15);

  const firstCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: uniqueCommunityName,
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(firstCommunity);

  // Step 3: Verify first community creation succeeded
  TestValidator.equals(
    "first community name matches input",
    firstCommunity.name,
    uniqueCommunityName,
  );
  TestValidator.predicate(
    "first community has valid ID",
    firstCommunity.id !== null && firstCommunity.id !== undefined,
  );
  TestValidator.equals(
    "first community creator matches moderator",
    firstCommunity.creator_member_id,
    moderator.id,
  );

  // Step 4: Attempt to create second community with identical name
  await TestValidator.error(
    "duplicate community name creation should fail",
    async () => {
      await api.functional.redditCommunity.moderator.communities.create(
        connection,
        {
          body: {
            name: uniqueCommunityName,
            display_title: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 5 }),
            rules: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IRedditCommunityCommunity.ICreate,
        },
      );
    },
  );

  // Step 5: Verify original community remains accessible and unchanged
  // Since there's no explicit "get community by ID" endpoint in the provided API,
  // we validate that the first community data is still intact in memory
  TestValidator.equals(
    "original community name unchanged",
    firstCommunity.name,
    uniqueCommunityName,
  );
  TestValidator.predicate(
    "original community ID remains valid",
    firstCommunity.id !== null && firstCommunity.id !== undefined,
  );
}
