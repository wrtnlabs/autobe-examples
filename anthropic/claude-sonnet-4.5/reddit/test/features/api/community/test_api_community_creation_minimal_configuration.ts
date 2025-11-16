import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test creating a community with minimal configuration (required fields only).
 *
 * This test validates that moderators can create communities without providing
 * optional branding elements like icon_url and banner_url. The community should
 * be created successfully with all required fields properly stored and optional
 * fields defaulting to null or undefined.
 *
 * Test workflow:
 *
 * 1. Register and authenticate as a moderator
 * 2. Create a community with only required fields (no icon_url or banner_url)
 * 3. Verify the community is created successfully
 * 4. Validate that all required fields are properly stored
 * 5. Confirm that optional branding fields are null/undefined
 */
export async function test_api_community_creation_minimal_configuration(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "securePassword123",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a community with minimal configuration (required fields only)
  const communityName = RandomGenerator.alphabets(10);
  const communityData = {
    name: communityName,
    display_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 6,
    }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    rules: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3 & 4: Validate that all required fields are properly stored
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityData.name,
  );
  TestValidator.equals(
    "community display title matches input",
    community.display_title,
    communityData.display_title,
  );
  TestValidator.equals(
    "community description matches input",
    community.description,
    communityData.description,
  );
  TestValidator.equals(
    "community rules match input",
    community.rules,
    communityData.rules,
  );

  // Step 5: Confirm that optional branding fields are null/undefined
  TestValidator.predicate(
    "icon_url should be null or undefined when not provided",
    community.icon_url === null || community.icon_url === undefined,
  );
  TestValidator.predicate(
    "banner_url should be null or undefined when not provided",
    community.banner_url === null || community.banner_url === undefined,
  );

  // Additional business logic validations
  TestValidator.equals(
    "creator_member_id should match authenticated moderator",
    community.creator_member_id,
    moderator.id,
  );
  TestValidator.equals(
    "subscriber_count should initialize to 0",
    community.subscriber_count,
    0,
  );
  TestValidator.equals(
    "post_count should initialize to 0",
    community.post_count,
    0,
  );
  TestValidator.predicate(
    "deleted_at should be null or undefined for active community",
    community.deleted_at === null || community.deleted_at === undefined,
  );
}
