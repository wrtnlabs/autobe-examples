import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test the maximum length constraint enforcement for the display_title field
 * during community updates.
 *
 * This test validates that the API correctly enforces the maxLength constraint
 * of 100 characters for the display_title field when updating communities. It
 * tests both the valid boundary case (exactly 100 characters) and the invalid
 * case (exceeding 100 characters).
 *
 * Test workflow:
 *
 * 1. Register a moderator account and establish authentication
 * 2. Create a test community
 * 3. Update with exactly 100 characters display_title (valid boundary) - should
 *    succeed
 * 4. Update with more than 100 characters display_title - should fail validation
 * 5. Verify all responses and validation behaviors are correct
 */
export async function test_api_community_update_display_title_length_validation(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "securePassword123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a test community
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          rules: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 3,
            wordMax: 7,
          }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Test valid boundary - exactly 100 characters
  const validDisplayTitle = RandomGenerator.alphabets(100);
  TestValidator.equals(
    "valid display_title length should be exactly 100",
    validDisplayTitle.length,
    100,
  );

  const updatedCommunityValid: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.putByCommunityid(
      connection,
      {
        communityId: community.id,
        body: {
          display_title: validDisplayTitle,
        } satisfies IRedditCommunityCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunityValid);
  TestValidator.equals(
    "updated display_title should match the valid 100-character string",
    updatedCommunityValid.display_title,
    validDisplayTitle,
  );

  // Step 4: Test invalid boundary - exceeding 100 characters (101 characters)
  const invalidDisplayTitle = RandomGenerator.alphabets(101);
  TestValidator.equals(
    "invalid display_title length should be 101",
    invalidDisplayTitle.length,
    101,
  );

  await TestValidator.error(
    "update with display_title exceeding 100 characters should fail",
    async () => {
      await api.functional.redditCommunity.moderator.communities.putByCommunityid(
        connection,
        {
          communityId: community.id,
          body: {
            display_title: invalidDisplayTitle,
          } satisfies IRedditCommunityCommunity.IUpdate,
        },
      );
    },
  );
}
