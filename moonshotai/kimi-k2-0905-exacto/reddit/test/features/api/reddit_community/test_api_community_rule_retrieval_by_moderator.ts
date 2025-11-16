import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test that community moderators can retrieve detailed information about
 * specific community rules.
 *
 * This test validates the complete workflow for community rule retrieval by
 * moderators:
 *
 * 1. Create a community moderator account for authentication
 * 2. Create a community to host rules
 * 3. Create a community rule with detailed information
 * 4. Retrieve the specific rule and validate all details
 * 5. Verify rule scoping within the community context
 *
 * The test ensures moderators can access rule details including rule number,
 * title, description, and violation consequences for effective community
 * governance.
 */
export async function test_api_community_rule_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: "SecurePassword123!",
        nickname: RandomGenerator.name(),
        href: "https://reddit-community.com/join",
        referrer: "https://reddit-community.com/",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 2: Create a separate connection context for member operations
  const memberConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 3: Create a community as a member first (to have a community for rules)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.member.join(memberConnection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      nickname: RandomGenerator.name(),
    } satisfies IRedditCommunityMember.ICreate,
  });

  const community =
    await api.functional.redditCommunity.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10).toLowerCase(),
          title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          category_name: "Technology",
          type: "public",
          allow_crosspost: true,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create a community rule as moderator (using original connection with moderator auth)
  const ruleTitle = "No Spam or Self-Promotion";
  const ruleDescription =
    "Posts and comments that are identified as spam or excessive self-promotion will be removed. This includes repetitive promotional content without meaningful contribution to discussions.";
  const ruleConsequence =
    "Content removal and potential temporary suspension for repeated violations";

  const createdRule =
    await api.functional.redditCommunity.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: ruleTitle,
          description: ruleDescription,
          violation_consequence: ruleConsequence,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(createdRule);

  // Step 5: Retrieve the specific rule and validate details
  const retrievedRule =
    await api.functional.redditCommunity.communityModerator.communities.rules.at(
      connection,
      {
        communityName: community.name,
        ruleId: createdRule.id,
      },
    );
  typia.assert(retrievedRule);

  // Step 6: Validate rule details match expectations
  TestValidator.equals("rule ID matches", retrievedRule.id, createdRule.id);
  TestValidator.equals("rule title matches", retrievedRule.title, ruleTitle);
  TestValidator.equals(
    "rule description matches",
    retrievedRule.description,
    ruleDescription,
  );
  TestValidator.equals(
    "rule consequence matches",
    retrievedRule.violation_consequence,
    ruleConsequence,
  );
  TestValidator.equals(
    "rule number matches",
    retrievedRule.rule_number,
    createdRule.rule_number,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedRule.reddit_community_community_id,
    createdRule.reddit_community_community_id,
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

  // Step 7: Verify rule structure integrity
  TestValidator.predicate(
    "rule has valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedRule.id,
    ),
  );
  TestValidator.predicate(
    "rule number is within valid range",
    retrievedRule.rule_number >= 1 && retrievedRule.rule_number <= 15,
  );
  TestValidator.predicate(
    "rule title is not empty",
    retrievedRule.title.length > 0,
  );
  TestValidator.predicate(
    "rule description is not empty",
    retrievedRule.description.length > 0,
  );
  TestValidator.predicate(
    "rule consequence is provided",
    retrievedRule.violation_consequence !== null &&
      retrievedRule.violation_consequence !== undefined &&
      retrievedRule.violation_consequence.length > 0,
  );
}
