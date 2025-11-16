import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test that community creation enforces unique name constraints across the
 * platform.
 *
 * This test validates the critical business rule that community names must be
 * globally unique to prevent URL conflicts and user confusion. Community names
 * serve as URL identifiers (e.g., /r/community_name), so duplicate names would
 * create routing conflicts and namespace collisions.
 *
 * Test Flow:
 *
 * 1. Create and authenticate first moderator account
 * 2. Create first community with a specific unique name (should succeed)
 * 3. Create and authenticate second moderator account (different user)
 * 4. Attempt to create second community with the SAME name (should fail)
 * 5. Validate that duplicate name creation fails with appropriate error
 *
 * This ensures URL stability and prevents duplicate community identifiers in
 * the system.
 */
export async function test_api_community_creation_name_uniqueness(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate first moderator
  const firstModeratorEmail = typia.random<string & tags.Format<"email">>();
  const firstModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: firstModeratorEmail,
        password: "SecurePassword123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(firstModerator);

  // Step 2: Create first community with a specific name (should succeed)
  const uniqueCommunityName = RandomGenerator.alphabets(10);
  const firstCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: uniqueCommunityName,
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(firstCommunity);

  // Validate first community was created with correct name
  TestValidator.equals(
    "first community name matches requested name",
    firstCommunity.name,
    uniqueCommunityName,
  );

  // Step 3: Create and authenticate second moderator (different user)
  const secondModeratorEmail = typia.random<string & tags.Format<"email">>();
  const secondModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: secondModeratorEmail,
        password: "AnotherSecurePass456!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(secondModerator);

  // Step 4 & 5: Attempt to create second community with SAME name (should fail)
  await TestValidator.error(
    "duplicate community name should fail",
    async () => {
      await api.functional.redditCommunity.moderator.communities.create(
        connection,
        {
          body: {
            name: uniqueCommunityName,
            display_title: RandomGenerator.name(3),
            description: RandomGenerator.paragraph({ sentences: 5 }),
            rules: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IRedditCommunityCommunity.ICreate,
        },
      );
    },
  );
}
