import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityRule";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityRule";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test retrieving community rules as an unauthenticated guest user.
 *
 * This test validates the public accessibility of community rules, ensuring
 * transparency for all users considering participation in a community. The test
 * verifies that:
 *
 * 1. Community rules are accessible without authentication
 * 2. Rules are returned in correct display_order
 * 3. All rule metadata (title, description, type, display_order) is included
 * 4. The operation supports communities with varying numbers of rules (0 to 15)
 *
 * Test flow:
 *
 * 1. Create moderator account
 * 2. Create a test community
 * 3. Create multiple rules with different types and display orders
 * 4. Retrieve rules as unauthenticated user (clear connection headers)
 * 5. Validate rules are properly ordered and contain complete metadata
 * 6. Test edge case: community with no rules
 */
export async function test_api_community_rules_retrieval_public_access(
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

  // Step 2: Create a test community
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: RandomGenerator.pick([
          "technology",
          "gaming",
          "sports",
          "music",
          "art",
        ] as const),
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create multiple rules with different types and display orders
  const ruleTypes = ["required", "prohibited", "etiquette"] as const;
  const createdRules: IRedditLikeCommunityRule[] = [];

  const ruleCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<5> & tags.Maximum<10>
  >() satisfies number as number;

  for (let i = 0; i < ruleCount; i++) {
    const rule: IRedditLikeCommunityRule =
      await api.functional.redditLike.moderator.communities.rules.create(
        connection,
        {
          communityId: community.id,
          body: {
            title: RandomGenerator.paragraph({
              sentences: 3,
              wordMin: 3,
              wordMax: 7,
            }),
            description: RandomGenerator.paragraph({
              sentences: 10,
              wordMin: 4,
              wordMax: 8,
            }),
            rule_type: RandomGenerator.pick(ruleTypes),
            display_order: i + 1,
          } satisfies IRedditLikeCommunityRule.ICreate,
        },
      );
    typia.assert(rule);
    createdRules.push(rule);
  }

  // Step 4: Retrieve rules as unauthenticated user
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  const rulesResponse: IPageIRedditLikeCommunityRule =
    await api.functional.redditLike.communities.rules.index(unauthConnection, {
      communityId: community.id,
    });
  typia.assert(rulesResponse);

  // Step 5: Validate rules are properly ordered and contain complete metadata
  TestValidator.equals(
    "retrieved rules count matches created rules count",
    rulesResponse.data.length,
    createdRules.length,
  );

  // Verify rules are ordered by display_order
  for (let i = 0; i < rulesResponse.data.length; i++) {
    const retrievedRule = rulesResponse.data[i];
    const expectedRule = createdRules[i];

    TestValidator.equals("rule ID matches", retrievedRule.id, expectedRule.id);

    TestValidator.equals(
      "rule title matches",
      retrievedRule.title,
      expectedRule.title,
    );

    TestValidator.equals(
      "rule description matches",
      retrievedRule.description,
      expectedRule.description,
    );

    TestValidator.equals(
      "rule type matches",
      retrievedRule.rule_type,
      expectedRule.rule_type,
    );

    TestValidator.equals(
      "rule display order matches",
      retrievedRule.display_order,
      expectedRule.display_order,
    );

    TestValidator.equals(
      "rule display order is sequential",
      retrievedRule.display_order,
      i + 1,
    );
  }

  // Step 6: Test edge case - community with no rules
  const emptyCommunity: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
        privacy_type: "public",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(emptyCommunity);

  const emptyRulesResponse: IPageIRedditLikeCommunityRule =
    await api.functional.redditLike.communities.rules.index(unauthConnection, {
      communityId: emptyCommunity.id,
    });
  typia.assert(emptyRulesResponse);

  TestValidator.equals(
    "community with no rules returns empty array",
    emptyRulesResponse.data.length,
    0,
  );
}
