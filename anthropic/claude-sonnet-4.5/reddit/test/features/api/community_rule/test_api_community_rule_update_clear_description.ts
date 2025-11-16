import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

/**
 * Test updating a community rule to remove its detailed description by setting
 * it to null.
 *
 * This scenario validates that moderators can simplify rules when the title
 * becomes self-explanatory, reducing redundancy in community guidelines. The
 * test creates a rule with both title and description, then updates the
 * description field to null. It verifies that the description is successfully
 * cleared while the title and other fields remain intact.
 *
 * Workflow:
 *
 * 1. Create moderator account for rule management
 * 2. Create community owned by the moderator
 * 3. Create a rule with both title and description
 * 4. Update the rule to clear the description (set to null)
 * 5. Verify description is null while title remains unchanged
 */
export async function test_api_community_rule_update_clear_description(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "securePassword123",
        nickname: RandomGenerator.name(),
        href: "https://reddit-community.example.com/signup" satisfies string &
          tags.Format<"uri">,
        referrer: "https://reddit-community.example.com/" satisfies string &
          tags.Format<"uri">,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community
  const communityName = RandomGenerator.alphaNumeric(15);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create rule with both title and description
  const ruleTitle = "Be respectful to all members";
  const ruleDescription =
    "All members must treat each other with respect and courtesy. Personal attacks, harassment, and hate speech are strictly prohibited.";
  const createdRule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: ruleTitle,
          description: ruleDescription,
          rule_number: 1,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(createdRule);

  // Verify rule was created with description
  TestValidator.equals(
    "created rule title matches",
    createdRule.title,
    ruleTitle,
  );
  TestValidator.equals(
    "created rule has description",
    createdRule.description,
    ruleDescription,
  );

  // Step 4: Update the rule to clear description (set to null)
  const updatedRule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.update(
      connection,
      {
        communityName: community.name,
        ruleId: createdRule.id,
        body: {
          description: null,
        } satisfies IRedditCommunityCommunityRule.IUpdate,
      },
    );
  typia.assert(updatedRule);

  // Step 5: Verify description is cleared while title remains unchanged
  TestValidator.equals(
    "updated rule title remains unchanged",
    updatedRule.title,
    ruleTitle,
  );
  TestValidator.equals(
    "updated rule description is cleared",
    updatedRule.description,
    null,
  );
  TestValidator.equals(
    "updated rule number remains unchanged",
    updatedRule.rule_number,
    1,
  );
  TestValidator.equals(
    "updated rule ID matches original",
    updatedRule.id,
    createdRule.id,
  );
}
