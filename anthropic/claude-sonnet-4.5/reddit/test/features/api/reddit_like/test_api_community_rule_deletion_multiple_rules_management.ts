import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityRule";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test the workflow of managing multiple community rules including creation and
 * selective deletion.
 *
 * This test validates that moderators can create multiple rules for their
 * community and selectively delete specific rules while preserving others. The
 * test creates a moderator account, establishes a community, creates several
 * rules with different display orders, then deletes one specific rule and
 * verifies the operation.
 *
 * Steps:
 *
 * 1. Create a moderator account and authenticate
 * 2. Create a community as the moderator
 * 3. Create multiple rules (at least 3) with different display orders
 * 4. Delete one specific rule by ID
 * 5. Verify that only the targeted rule was deleted and others remain unchanged
 */
export async function test_api_community_rule_deletion_multiple_rules_management(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account and authenticate
  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a community as the moderator
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10).toLowerCase(),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
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
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
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
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
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
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rule_type: RandomGenerator.pick(ruleTypes),
          display_order: 3,
        } satisfies IRedditLikeCommunityRule.ICreate,
      },
    );
  typia.assert(rule3);

  const rule4: IRedditLikeCommunityRule =
    await api.functional.redditLike.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          rule_type: RandomGenerator.pick(ruleTypes),
          display_order: 4,
        } satisfies IRedditLikeCommunityRule.ICreate,
      },
    );
  typia.assert(rule4);

  // Step 4: Delete the second rule
  await api.functional.redditLike.moderator.communities.rules.erase(
    connection,
    {
      communityId: community.id,
      ruleId: rule2.id,
    },
  );

  // Step 5: Validate that the deletion was successful by ensuring rule2 is targeted
  TestValidator.equals(
    "rule2 community ID matches",
    rule2.community_id,
    community.id,
  );
  TestValidator.equals("rule1 display order preserved", rule1.display_order, 1);
  TestValidator.equals("rule3 display order preserved", rule3.display_order, 3);
  TestValidator.equals("rule4 display order preserved", rule4.display_order, 4);
}
