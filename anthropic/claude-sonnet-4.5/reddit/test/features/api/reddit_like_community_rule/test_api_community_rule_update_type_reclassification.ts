import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityRule";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test the workflow of reclassifying a community rule's type as community
 * culture evolves.
 *
 * This test validates that moderators can successfully change a rule's type
 * classification (from 'etiquette' to 'required') while preserving all other
 * rule attributes. This capability is essential for community governance as
 * communities grow and their standards evolve.
 *
 * Process:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a community for rule management
 * 3. Create an initial rule with type 'etiquette'
 * 4. Update the rule to change its type to 'required'
 * 5. Validate that the type change was successful and other attributes remain
 *    intact
 */
export async function test_api_community_rule_update_type_reclassification(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: moderatorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "general",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create rule with initial type 'etiquette'
  const initialRuleTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 6,
  });
  const initialRuleDescription = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 10,
  });

  const createdRule: IRedditLikeCommunityRule =
    await api.functional.redditLike.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          title: initialRuleTitle,
          description: initialRuleDescription,
          rule_type: "etiquette",
          display_order: 1,
        } satisfies IRedditLikeCommunityRule.ICreate,
      },
    );
  typia.assert(createdRule);

  // Verify initial rule type
  TestValidator.equals(
    "initial rule type is etiquette",
    createdRule.rule_type,
    "etiquette",
  );
  TestValidator.equals(
    "initial rule title matches",
    createdRule.title,
    initialRuleTitle,
  );
  TestValidator.equals(
    "initial rule description matches",
    createdRule.description,
    initialRuleDescription,
  );
  TestValidator.equals("initial display order", createdRule.display_order, 1);

  // Step 4: Update rule to change type from 'etiquette' to 'required'
  const updatedRule: IRedditLikeCommunityRule =
    await api.functional.redditLike.moderator.communities.rules.update(
      connection,
      {
        communityId: community.id,
        ruleId: createdRule.id,
        body: {
          rule_type: "required",
        } satisfies IRedditLikeCommunityRule.IUpdate,
      },
    );
  typia.assert(updatedRule);

  // Step 5: Validate type reclassification and attribute preservation
  TestValidator.equals(
    "rule type changed to required",
    updatedRule.rule_type,
    "required",
  );
  TestValidator.equals(
    "rule title preserved",
    updatedRule.title,
    initialRuleTitle,
  );
  TestValidator.equals(
    "rule description preserved",
    updatedRule.description,
    initialRuleDescription,
  );
  TestValidator.equals("display order preserved", updatedRule.display_order, 1);
  TestValidator.equals("rule ID unchanged", updatedRule.id, createdRule.id);
  TestValidator.equals(
    "community ID unchanged",
    updatedRule.community_id,
    community.id,
  );
}
