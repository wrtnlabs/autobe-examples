import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test the workflow of updating community rules and guidelines to reflect
 * evolving community standards.
 *
 * This test validates how moderators adapt community standards as the community
 * evolves and new moderation challenges arise. It creates a moderator account,
 * establishes a community with initial rules, then updates the rules field with
 * comprehensive new behavioral guidelines and content standards.
 *
 * Test Steps:
 *
 * 1. Create moderator account for community rule management
 * 2. Create community with initial basic rules
 * 3. Update community rules with comprehensive new guidelines
 * 4. Verify that the updated rules are properly persisted
 * 5. Validate that the rules field accepts detailed community standards
 * 6. Confirm the response reflects the new rules accurately
 */
export async function test_api_community_update_rules_modification(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";
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

  // Step 2: Create community with initial basic rules
  const communityName = RandomGenerator.alphaNumeric(12);
  const initialRules = "Be respectful. Stay on topic. No spam.";

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 6,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 5,
            wordMax: 10,
          }),
          rules: initialRules,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "initial rules are set correctly",
    community.rules,
    initialRules,
  );

  // Step 3: Update community with comprehensive new rules
  const updatedRules =
    "1. Be respectful to all community members - harassment, hate speech, and personal attacks are strictly prohibited. " +
    "2. Stay on topic - all posts must be relevant to the community's focus area. " +
    "3. No spam or self-promotion - excessive self-promotion, advertising, or spam will result in removal. " +
    "4. Use appropriate content warnings - mark NSFW, spoilers, and sensitive content accordingly. " +
    "5. Cite sources - when sharing information, provide credible sources when possible. " +
    "6. Report violations - help moderators by reporting rule-breaking content. " +
    "7. No brigading or vote manipulation - do not coordinate voting or harassment campaigns. " +
    "8. Respect privacy - do not share personal information without consent.";

  const updatedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.putByCommunityid(
      connection,
      {
        communityId: community.id,
        body: {
          rules: updatedRules,
        } satisfies IRedditCommunityCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);

  // Step 4: Verify the updated rules are properly persisted
  TestValidator.equals(
    "community ID remains unchanged",
    updatedCommunity.id,
    community.id,
  );
  TestValidator.equals(
    "updated rules are correctly set",
    updatedCommunity.rules,
    updatedRules,
  );
  TestValidator.notEquals(
    "rules have been changed from initial",
    updatedCommunity.rules,
    initialRules,
  );

  // Step 5: Validate that the rules field accepts text content for detailed community standards
  TestValidator.predicate(
    "updated rules contain comprehensive guidelines",
    updatedRules.length > initialRules.length,
  );

  // Step 6: Confirm other community properties remain unchanged
  TestValidator.equals(
    "community name unchanged",
    updatedCommunity.name,
    community.name,
  );
  TestValidator.equals(
    "display title unchanged",
    updatedCommunity.display_title,
    community.display_title,
  );
  TestValidator.equals(
    "description unchanged",
    updatedCommunity.description,
    community.description,
  );
}
