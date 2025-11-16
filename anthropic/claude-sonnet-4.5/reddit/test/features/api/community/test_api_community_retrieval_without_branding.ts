import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test retrieval of a community created without optional branding elements.
 *
 * This test validates that communities created with only required fields
 * (without icon_url or banner_url) can be successfully retrieved and that the
 * branding fields are correctly represented as null in the response.
 *
 * Test Flow:
 *
 * 1. Register and authenticate as a moderator
 * 2. Create a community with minimal required fields (no branding)
 * 3. Retrieve the created community by name
 * 4. Validate that branding fields are null/undefined
 * 5. Verify all other fields match the creation data
 */
export async function test_api_community_retrieval_without_branding(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a community with minimal fields - NO branding elements
  const communityName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityData = {
    name: communityName,
    display_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    rules: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    // Intentionally omitting icon_url and banner_url to test null handling
  } satisfies IRedditCommunityCommunity.ICreate;

  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(createdCommunity);

  // Step 3: Retrieve the community by its name
  const retrievedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.communities.at(connection, {
      communityName: communityName,
    });
  typia.assert(retrievedCommunity);

  // Step 4: Validate that icon_url and banner_url are null/undefined
  TestValidator.predicate(
    "icon_url should be null or undefined when not provided",
    retrievedCommunity.icon_url === null ||
      retrievedCommunity.icon_url === undefined,
  );

  TestValidator.predicate(
    "banner_url should be null or undefined when not provided",
    retrievedCommunity.banner_url === null ||
      retrievedCommunity.banner_url === undefined,
  );

  // Step 5: Verify core fields match creation data
  TestValidator.equals(
    "community name matches",
    retrievedCommunity.name,
    communityData.name,
  );

  TestValidator.equals(
    "display title matches",
    retrievedCommunity.display_title,
    communityData.display_title,
  );

  TestValidator.equals(
    "description matches",
    retrievedCommunity.description,
    communityData.description,
  );

  TestValidator.equals(
    "rules match",
    retrievedCommunity.rules,
    communityData.rules,
  );

  // Step 6: Verify system-generated fields have expected initial values
  TestValidator.equals(
    "subscriber_count initialized to 0",
    retrievedCommunity.subscriber_count,
    0,
  );

  TestValidator.equals(
    "post_count initialized to 0",
    retrievedCommunity.post_count,
    0,
  );
}
