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

export async function test_api_member_community_rule_access(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator for community and rule creation
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
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 2: Create community for rule testing
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: `Test Community ${RandomGenerator.name()}`,
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        category_name: "Technology",
        type: "public",
        allow_crosspost: true,
        post_requirement_min_age: null,
        post_requirement_min_karma: null,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create specific rule within community
  const ruleCreation = {
    title: "No Spam or Self-Promotion",
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 8,
    }),
    violation_consequence:
      "Content will be removed and repeat violations may result in a temporary or permanent ban",
  } satisfies IRedditCommunityCommunityRule.ICreate;

  const rule =
    await api.functional.redditCommunity.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: ruleCreation,
      },
    );
  typia.assert(rule);

  // Step 4: Create member for rule access testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "member123",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 5: Member accesses the community rule
  const retrievedRule =
    await api.functional.redditCommunity.member.communities.rules.at(
      connection,
      {
        communityName: community.name,
        ruleId: rule.id,
      },
    );
  typia.assert(retrievedRule);

  // Step 6: Validate rule information matches creation data
  TestValidator.equals(
    "retrieved rule ID matches created rule",
    retrievedRule.id,
    rule.id,
  );
  TestValidator.equals(
    "rule title matches creation",
    retrievedRule.title,
    ruleCreation.title,
  );
  TestValidator.equals(
    "rule description matches creation",
    retrievedRule.description,
    ruleCreation.description,
  );
  TestValidator.equals(
    "rule violation consequence matches",
    retrievedRule.violation_consequence,
    ruleCreation.violation_consequence,
  );
  TestValidator.equals(
    "rule belongs to correct community",
    retrievedRule.reddit_community_community_id,
    community.id,
  );

  // Additional validations for business logic completeness
  TestValidator.predicate(
    "rule has valid rule number",
    retrievedRule.rule_number >= 1 && retrievedRule.rule_number <= 15,
  );
  TestValidator.predicate(
    "rule has creation timestamp",
    retrievedRule.created_at !== null,
  );
  TestValidator.predicate(
    "rule has update timestamp",
    retrievedRule.updated_at !== null,
  );
  TestValidator.predicate(
    "created_at is before updated_at",
    new Date(retrievedRule.created_at).getTime() <=
      new Date(retrievedRule.updated_at).getTime(),
  );
}
