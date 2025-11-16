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

export async function test_api_community_rule_creation_with_sequential_numbering(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator for rule creation operations
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        nickname: RandomGenerator.name(),
        password: "moderator123",
        href: "https://reddit-community.com/join",
        referrer: "https://reddit-community.com",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 2: Create a community to establish context
  const communityName = RandomGenerator.alphabets(8).toLowerCase();
  const communityBody = {
    name: communityName,
    title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    category_name: "Technology", // Using a common category
    type: "public" as const,
    post_requirement_min_age: 0,
    post_requirement_min_karma: 0,
    allow_crosspost: true,
  } satisfies IRedditCommunityCommunity.ICreate;

  // Need to switch to member role first to create community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "member123",
    } satisfies IRedditCommunityMember.ICreate,
  });

  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // Step 3: Switch back to moderator to create rules
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      href: "https://reddit-community.com/login",
      referrer: "https://reddit-community.com",
    },
  });

  // Step 4: Create first rule using communityModerator endpoint
  const rule1Data = {
    title: "Be respectful",
    description: "Treat all members with respect and courtesy",
    violation_consequence: "Warning for first offense",
  } satisfies IRedditCommunityCommunityRule.ICreate;

  const rule1 =
    await api.functional.redditCommunity.communityModerator.communities.rules.create(
      connection,
      {
        communityName,
        body: rule1Data,
      },
    );
  typia.assert(rule1);

  TestValidator.equals("first rule number should be 1", rule1.rule_number, 1);
  TestValidator.equals(
    "first rule title matches",
    rule1.title,
    rule1Data.title,
  );

  // Step 5: Create second rule using general communities endpoint
  const rule2Data = {
    title: "No spam",
    description: "Avoid posting repetitive or promotional content",
    violation_consequence: "Post removal",
  } satisfies IRedditCommunityCommunityRule.ICreate;

  const rule2 =
    await api.functional.redditCommunity.communities.rules.createRule(
      connection,
      {
        communityName,
        body: rule2Data,
      },
    );
  typia.assert(rule2);

  TestValidator.equals("second rule number should be 2", rule2.rule_number, 2);
  TestValidator.equals(
    "second rule title matches",
    rule2.title,
    rule2Data.title,
  );

  // Step 6: Create third rule using moderator endpoint again
  const rule3Data = {
    title: "Stay on topic",
    description: "Keep discussions relevant to community theme",
    violation_consequence: "Comment removal",
  } satisfies IRedditCommunityCommunityRule.ICreate;

  const rule3 =
    await api.functional.redditCommunity.communityModerator.communities.rules.create(
      connection,
      {
        communityName,
        body: rule3Data,
      },
    );
  typia.assert(rule3);

  TestValidator.equals("third rule number should be 3", rule3.rule_number, 3);
  TestValidator.equals(
    "third rule title matches",
    rule3.title,
    rule3Data.title,
  );

  // Step 7: Verify all rules belong to the same community
  TestValidator.equals(
    "all rules belong to same community",
    rule1.reddit_community_community_id,
    rule2.reddit_community_community_id,
  );
  TestValidator.equals(
    "all rules belong to same community",
    rule1.reddit_community_community_id,
    rule3.reddit_community_community_id,
  );

  // Step 8: Verify rule numbers are sequential and unique
  TestValidator.notEquals(
    "rule numbers are different",
    rule1.rule_number,
    rule2.rule_number,
  );
  TestValidator.notEquals(
    "rule numbers are different",
    rule1.rule_number,
    rule3.rule_number,
  );
  TestValidator.notEquals(
    "rule numbers are different",
    rule2.rule_number,
    rule3.rule_number,
  );

  // Step 9: Verify sequential ordering constraint (each number increases by 1)
  TestValidator.predicate(
    "rules follow sequential numbering",
    rule2.rule_number === rule1.rule_number + 1 &&
      rule3.rule_number === rule2.rule_number + 1,
  );

  // Step 10: Verify rule numbers are within valid range (1-15)
  TestValidator.predicate(
    "rule numbers are within valid range",
    rule1.rule_number >= 1 &&
      rule1.rule_number <= 15 &&
      rule2.rule_number >= 1 &&
      rule2.rule_number <= 15 &&
      rule3.rule_number >= 1 &&
      rule3.rule_number <= 15,
  );
}
