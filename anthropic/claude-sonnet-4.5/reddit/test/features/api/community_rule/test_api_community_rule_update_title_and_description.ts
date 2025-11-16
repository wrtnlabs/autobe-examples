import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

/**
 * Test updating a community rule's title and description by an authorized
 * moderator.
 *
 * This test validates that moderators can refine rule text to clarify community
 * expectations as the community evolves. The test creates a community with an
 * initial rule, then updates both the title and description fields to new
 * values. It verifies that the updated content is correctly saved and returned,
 * while system-managed fields like created_at remain unchanged and updated_at
 * is properly refreshed.
 *
 * Test Flow:
 *
 * 1. Register moderator account and establish authentication
 * 2. Create community to provide context for rule management
 * 3. Create initial rule with baseline title and description
 * 4. Update the rule with new title and description values
 * 5. Validate all updated and unchanged fields are correct
 */
export async function test_api_community_rule_update_title_and_description(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorNickname = RandomGenerator.name();
  const currentUrl = typia.random<string & tags.Format<"uri">>();
  const referrerUrl = typia.random<string & tags.Format<"uri">>();

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: moderatorNickname,
        href: currentUrl,
        referrer: referrerUrl,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community
  const communityName = RandomGenerator.alphabets(10);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create initial rule
  const initialTitle = "Original Rule Title";
  const initialDescription = "Original rule description text";
  const ruleNumber = 1;

  const initialRule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: initialTitle,
          description: initialDescription,
          rule_number: ruleNumber,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(initialRule);

  // Verify initial state
  TestValidator.equals("initial rule title", initialRule.title, initialTitle);
  TestValidator.equals(
    "initial rule description",
    initialRule.description,
    initialDescription,
  );
  TestValidator.equals(
    "initial rule number",
    initialRule.rule_number,
    ruleNumber,
  );

  // Step 4: Update the rule with new title and description
  const newTitle = "Updated Rule Title - Clarified Expectations";
  const newDescription =
    "Updated rule description with more detailed guidance for community members";

  const updatedRule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.update(
      connection,
      {
        communityName: community.name,
        ruleId: initialRule.id,
        body: {
          title: newTitle,
          description: newDescription,
        } satisfies IRedditCommunityCommunityRule.IUpdate,
      },
    );
  typia.assert(updatedRule);

  // Step 5: Validate updated fields
  TestValidator.equals(
    "updated title matches new value",
    updatedRule.title,
    newTitle,
  );
  TestValidator.equals(
    "updated description matches new value",
    updatedRule.description,
    newDescription,
  );

  // Step 6: Validate unchanged fields
  TestValidator.equals("rule ID unchanged", updatedRule.id, initialRule.id);
  TestValidator.equals(
    "community ID unchanged",
    updatedRule.community_id,
    initialRule.community_id,
  );
  TestValidator.equals(
    "rule number unchanged",
    updatedRule.rule_number,
    initialRule.rule_number,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedRule.created_at,
    initialRule.created_at,
  );

  // Step 7: Validate updated_at was refreshed
  TestValidator.notEquals(
    "updated_at changed after modification",
    updatedRule.updated_at,
    initialRule.updated_at,
  );
}
