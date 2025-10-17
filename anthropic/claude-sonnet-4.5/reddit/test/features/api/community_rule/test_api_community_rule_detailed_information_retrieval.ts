import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityRule";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test retrieving comprehensive details about a specific community rule by its
 * unique identifier.
 *
 * This test validates the complete workflow of community rule creation and
 * retrieval:
 *
 * 1. Create a member account for community creation
 * 2. Member creates a community (becoming primary moderator)
 * 3. Create a separate moderator account
 * 4. Moderator creates a detailed community rule with complete metadata
 * 5. Retrieve the rule by ID and validate all fields match exactly
 *
 * The test ensures that:
 *
 * - Rule retrieval returns complete information including optional fields
 * - Rule type classification is preserved (required/prohibited/etiquette)
 * - Display ordering is correctly maintained
 * - All metadata necessary for moderation interfaces is present
 */
export async function test_api_community_rule_detailed_information_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Member creates a community
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 7,
        }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "discussion",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Moderator creates a detailed community rule
  const ruleTypes = ["required", "prohibited", "etiquette"] as const;
  const selectedRuleType = RandomGenerator.pick(ruleTypes);
  const displayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<15>
  >();

  const createdRule =
    await api.functional.redditLike.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({
            sentences: 8,
            wordMin: 4,
            wordMax: 10,
          }),
          rule_type: selectedRuleType,
          display_order: displayOrder,
        } satisfies IRedditLikeCommunityRule.ICreate,
      },
    );
  typia.assert(createdRule);

  // Step 5: Retrieve the rule by ID and validate all fields
  const retrievedRule = await api.functional.redditLike.communities.rules.at(
    connection,
    {
      communityId: community.id,
      ruleId: createdRule.id,
    },
  );
  typia.assert(retrievedRule);

  // Validate that retrieved rule matches created rule exactly
  TestValidator.equals("rule ID matches", retrievedRule.id, createdRule.id);
  TestValidator.equals(
    "community ID matches",
    retrievedRule.community_id,
    createdRule.community_id,
  );
  TestValidator.equals(
    "rule title matches",
    retrievedRule.title,
    createdRule.title,
  );
  TestValidator.equals(
    "rule description matches",
    retrievedRule.description,
    createdRule.description,
  );
  TestValidator.equals(
    "rule type matches",
    retrievedRule.rule_type,
    createdRule.rule_type,
  );
  TestValidator.equals(
    "display order matches",
    retrievedRule.display_order,
    createdRule.display_order,
  );
  TestValidator.equals(
    "created_at timestamp matches",
    retrievedRule.created_at,
    createdRule.created_at,
  );
  TestValidator.equals(
    "updated_at timestamp matches",
    retrievedRule.updated_at,
    createdRule.updated_at,
  );
}
