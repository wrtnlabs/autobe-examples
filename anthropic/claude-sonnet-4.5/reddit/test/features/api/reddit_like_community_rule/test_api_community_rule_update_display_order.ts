import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityRule";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test the workflow of reorganizing community rules by changing their display
 * order.
 *
 * This test validates that moderators can reorganize community rules by
 * updating their display order positions. The workflow ensures that:
 *
 * 1. Create moderator account for authentication
 * 2. Create a community to host the rules
 * 3. Create multiple rules (at least 3) with different display orders
 * 4. Update one rule's display_order to a different position
 * 5. Validate the updated rule has the new display order value
 * 6. Verify that rules can be reordered between 1 and 15
 */
export async function test_api_community_rule_update_display_order(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: moderatorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: RandomGenerator.name(2) satisfies string as string,
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }) satisfies string as string,
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create multiple rules with different display orders
  const ruleTypes = ["required", "prohibited", "etiquette"] as const;

  const rule1: IRedditLikeCommunityRule =
    await api.functional.redditLike.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }) satisfies string as string,
          description: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 4,
            wordMax: 8,
          }) satisfies string as string,
          rule_type: RandomGenerator.pick(ruleTypes),
          display_order: 1,
        } satisfies IRedditLikeCommunityRule.ICreate,
      },
    );
  typia.assert(rule1);

  const rule2: IRedditLikeCommunityRule =
    await api.functional.redditLike.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }) satisfies string as string,
          description: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 4,
            wordMax: 8,
          }) satisfies string as string,
          rule_type: RandomGenerator.pick(ruleTypes),
          display_order: 2,
        } satisfies IRedditLikeCommunityRule.ICreate,
      },
    );
  typia.assert(rule2);

  const rule3: IRedditLikeCommunityRule =
    await api.functional.redditLike.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }) satisfies string as string,
          description: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 4,
            wordMax: 8,
          }) satisfies string as string,
          rule_type: RandomGenerator.pick(ruleTypes),
          display_order: 3,
        } satisfies IRedditLikeCommunityRule.ICreate,
      },
    );
  typia.assert(rule3);

  // Step 4: Update one rule's display_order to a different position
  const newDisplayOrder = 5;
  const updatedRule: IRedditLikeCommunityRule =
    await api.functional.redditLike.moderator.communities.rules.update(
      connection,
      {
        communityId: community.id,
        ruleId: rule2.id,
        body: {
          display_order: newDisplayOrder,
        } satisfies IRedditLikeCommunityRule.IUpdate,
      },
    );
  typia.assert(updatedRule);

  // Step 5: Validate the updated rule has the new display order value
  TestValidator.equals(
    "updated rule should have new display order",
    updatedRule.display_order,
    newDisplayOrder,
  );

  // Step 6: Verify the rule ID remains the same after update
  TestValidator.equals(
    "updated rule should maintain same ID",
    updatedRule.id,
    rule2.id,
  );

  // Additional validation: Verify display order is within valid range (1-15)
  TestValidator.predicate(
    "display order should be within valid range 1-15",
    updatedRule.display_order >= 1 && updatedRule.display_order <= 15,
  );
}
