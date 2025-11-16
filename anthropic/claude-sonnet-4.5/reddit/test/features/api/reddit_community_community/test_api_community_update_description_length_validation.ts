import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test the description field length constraint during community updates.
 *
 * This test validates that the community description field properly enforces
 * the maximum length constraint of 500 characters defined in the
 * IRedditCommunityCommunity.IUpdate type. The test creates a moderator account,
 * establishes a community, and then updates the description with exactly 500
 * characters (maximum allowed) to verify the boundary condition works
 * correctly.
 *
 * The test ensures the API properly enforces the maxLength constraint of 500
 * characters for community descriptions, balancing informativeness with
 * conciseness.
 *
 * Test Flow:
 *
 * 1. Register a moderator account with valid credentials
 * 2. Create a community with initial description
 * 3. Update community description with exactly 500 characters (boundary test)
 * 4. Verify the update succeeded and description matches exactly
 * 5. Update with shorter description to verify normal operation
 */
export async function test_api_community_update_description_length_validation(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
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

  // Step 2: Create a community with initial description
  const communityName = RandomGenerator.alphabets(10);
  const initialDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          description: initialDescription,
          rules: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 7,
          }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Generate exactly 500-character description (maximum boundary)
  const maxLengthDescription = RandomGenerator.alphabets(500);
  TestValidator.equals(
    "max length description is exactly 500 characters",
    maxLengthDescription.length,
    500,
  );

  // Step 4: Update community with 500-character description
  const updatedCommunityMax: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.putByCommunityid(
      connection,
      {
        communityId: community.id,
        body: {
          description: maxLengthDescription,
        } satisfies IRedditCommunityCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunityMax);

  // Step 5: Verify the 500-character description was accepted and persisted
  TestValidator.equals(
    "community ID matches",
    updatedCommunityMax.id,
    community.id,
  );
  TestValidator.equals(
    "description updated to 500 characters",
    updatedCommunityMax.description,
    maxLengthDescription,
  );
  TestValidator.equals(
    "description length is exactly 500",
    updatedCommunityMax.description.length,
    500,
  );

  // Step 6: Update with shorter description to verify normal operation
  const shorterDescription = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 4,
    wordMax: 8,
  });

  const updatedCommunityShort: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.putByCommunityid(
      connection,
      {
        communityId: community.id,
        body: {
          description: shorterDescription,
        } satisfies IRedditCommunityCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunityShort);

  // Step 7: Verify shorter description update succeeded
  TestValidator.equals(
    "community ID still matches",
    updatedCommunityShort.id,
    community.id,
  );
  TestValidator.equals(
    "description updated to shorter value",
    updatedCommunityShort.description,
    shorterDescription,
  );
  TestValidator.predicate(
    "shorter description is under 500 characters",
    updatedCommunityShort.description.length < 500,
  );
}
