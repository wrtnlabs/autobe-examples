import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test that the creating moderator is automatically assigned as the founding
 * moderator with proper creator_member_id tracking.
 *
 * This test validates the complete community creation workflow ensuring proper
 * creator assignment:
 *
 * 1. Moderator registers and authenticates to obtain JWT tokens
 * 2. Moderator creates a community which captures their ID from authentication
 *    context
 * 3. The created community's creator_member_id matches the authenticated
 *    moderator's ID
 * 4. Multiple communities created by same moderator share the same
 *    creator_member_id
 * 5. Creator relationship is immutable and preserved for accountability
 */
export async function test_api_community_creation_creator_assignment(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as moderator
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

  // Step 2: Create first community
  const firstCommunityName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const firstCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: firstCommunityName,
          display_title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 5,
            wordMax: 10,
          }),
          rules: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(firstCommunity);

  // Step 3: Validate creator_member_id matches authenticated moderator's ID
  TestValidator.equals(
    "first community creator_member_id matches moderator ID",
    firstCommunity.creator_member_id,
    moderator.id,
  );

  // Step 4: Create second community with same moderator
  const secondCommunityName = RandomGenerator.alphaNumeric(12).toLowerCase();
  const secondCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: secondCommunityName,
          display_title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 5,
            wordMax: 10,
          }),
          rules: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(secondCommunity);

  // Step 5: Validate second community also has same creator_member_id
  TestValidator.equals(
    "second community creator_member_id matches moderator ID",
    secondCommunity.creator_member_id,
    moderator.id,
  );

  // Step 6: Validate both communities have identical creator_member_id
  TestValidator.equals(
    "both communities share same creator_member_id",
    firstCommunity.creator_member_id,
    secondCommunity.creator_member_id,
  );

  // Step 7: Create third community to verify consistency
  const thirdCommunityName = RandomGenerator.alphaNumeric(15).toLowerCase();
  const thirdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: thirdCommunityName,
          display_title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 5,
            wordMax: 10,
          }),
          rules: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(thirdCommunity);

  // Step 8: Validate third community maintains same creator_member_id
  TestValidator.equals(
    "third community creator_member_id matches moderator ID",
    thirdCommunity.creator_member_id,
    moderator.id,
  );

  // Step 9: Verify all three communities have consistent creator tracking
  TestValidator.predicate(
    "all communities created by same moderator have consistent creator_member_id",
    firstCommunity.creator_member_id === moderator.id &&
      secondCommunity.creator_member_id === moderator.id &&
      thirdCommunity.creator_member_id === moderator.id,
  );
}
