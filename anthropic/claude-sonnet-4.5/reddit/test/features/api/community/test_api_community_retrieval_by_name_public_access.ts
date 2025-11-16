import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test public retrieval of community details by community name without
 * authentication.
 *
 * This test validates that unauthenticated users (guests) can retrieve
 * community information using the unique community name identifier. The
 * workflow includes:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a test community with complete metadata
 * 3. Retrieve the community using its name from an unauthenticated connection
 * 4. Validate all community properties are correctly returned
 *
 * This ensures public community discovery is working correctly and all metadata
 * is accessible without requiring user authentication.
 */
export async function test_api_community_retrieval_by_name_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(16);

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: RandomGenerator.name(),
        ip: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()}`,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create test community with complete metadata
  const communityName = RandomGenerator.alphabets(10);
  const communityData = {
    name: communityName,
    display_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    rules: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(createdCommunity);

  // Step 3: Create unauthenticated connection for public access
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 4: Retrieve community by name using unauthenticated connection
  const retrievedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.communities.at(
      unauthenticatedConnection,
      {
        communityName: communityName,
      },
    );
  typia.assert(retrievedCommunity);

  // Step 5: Validate all community properties match
  TestValidator.equals(
    "community id matches",
    retrievedCommunity.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedCommunity.name,
    communityName,
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
  TestValidator.equals(
    "icon URL matches",
    retrievedCommunity.icon_url,
    communityData.icon_url,
  );
  TestValidator.equals(
    "banner URL matches",
    retrievedCommunity.banner_url,
    communityData.banner_url,
  );
  TestValidator.equals(
    "creator member ID matches",
    retrievedCommunity.creator_member_id,
    createdCommunity.creator_member_id,
  );
  TestValidator.equals(
    "subscriber count matches",
    retrievedCommunity.subscriber_count,
    createdCommunity.subscriber_count,
  );
  TestValidator.equals(
    "post count matches",
    retrievedCommunity.post_count,
    createdCommunity.post_count,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedCommunity.created_at,
    createdCommunity.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedCommunity.updated_at,
    createdCommunity.updated_at,
  );
}
