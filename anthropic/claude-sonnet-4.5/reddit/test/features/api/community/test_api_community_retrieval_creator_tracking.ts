import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test that retrieved community data includes creator_member_id for ownership
 * tracking.
 *
 * This test validates that:
 *
 * 1. The response includes creator_member_id field
 * 2. The creator_member_id matches the moderator who created the community
 * 3. This field is immutable and preserved for accountability
 * 4. The creator relationship is exposed for displaying founder information
 * 5. UUID format is used for creator_member_id
 *
 * Business context: Community ownership attribution must be available to
 * establish accountability, display founder information, and maintain
 * historical records of who created each community.
 *
 * Step-by-step process:
 *
 * 1. Authenticate as a moderator to establish creator identity
 * 2. Create a test community with the authenticated moderator
 * 3. Retrieve the community by its unique name
 * 4. Validate creator_member_id exists in the response
 * 5. Verify creator_member_id matches the moderator's ID
 * 6. Confirm UUID format is used for the creator_member_id
 */
export async function test_api_community_retrieval_creator_tracking(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to establish creator identity
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "password1234";
  const moderatorNickname = RandomGenerator.name();

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: moderatorNickname,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a community with the authenticated moderator
  const communityName = RandomGenerator.alphabets(10);
  const communityData = {
    name: communityName,
    display_title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 7,
    }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    rules: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 6 }),
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

  // Step 3: Retrieve the community by name
  const retrievedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.communities.at(connection, {
      communityName: communityName,
    });
  typia.assert(retrievedCommunity);

  // Step 4: Validate creator_member_id exists and matches the moderator ID
  TestValidator.equals(
    "creator_member_id matches authenticated moderator ID",
    retrievedCommunity.creator_member_id,
    moderator.id,
  );

  // Step 5: Verify creator_member_id from created community also matches
  TestValidator.equals(
    "created community creator_member_id matches moderator ID",
    createdCommunity.creator_member_id,
    moderator.id,
  );

  // Step 6: Ensure creator_member_id is consistent between creation and retrieval
  TestValidator.equals(
    "creator_member_id is immutable and preserved",
    retrievedCommunity.creator_member_id,
    createdCommunity.creator_member_id,
  );
}
