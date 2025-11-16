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

export async function test_api_community_rule_retrieval_by_member(
  connection: api.IConnection,
) {
  // 1. Create a new member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "password123",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // 2. Create community moderator account for rule creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: "password123",
        nickname: RandomGenerator.name(),
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // 3. Create a new community using member account
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({
          sentences: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        }),
        category_name: "Technology",
        type: "public",
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // 4. Switch to moderator and create a community rule
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "password123",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const ruleTitle = RandomGenerator.paragraph({
    sentences: 1,
  });
  const rule =
    await api.functional.redditCommunity.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: ruleTitle,
          description: RandomGenerator.content({
            paragraphs: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
            >(),
            sentenceMin: 10,
            sentenceMax: 20,
          }),
          violation_consequence:
            "Posts will be removed and repeat offenders may be warned",
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(rule);

  // 5. Switch back to member authentication
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      href: "https://example.com",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IRedditCommunityMember.ILoginRequest,
  });

  // 6. Retrieve the community rule details
  const retrievedRule =
    await api.functional.redditCommunity.communities.rules.getRule(connection, {
      communityName: community.name,
      ruleId: rule.id,
    });
  typia.assert(retrievedRule);

  // 7. Validate all rule details match expectations
  TestValidator.equals("rule ID matches", retrievedRule.id, rule.id);
  TestValidator.equals("rule title matches", retrievedRule.title, ruleTitle);
  TestValidator.equals(
    "rule description matches",
    retrievedRule.description,
    rule.description,
  );
  TestValidator.equals(
    "rule violation consequence matches",
    retrievedRule.violation_consequence,
    rule.violation_consequence,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedRule.reddit_community_community_id,
    rule.reddit_community_community_id,
  );
  TestValidator.predicate(
    "rule has rule number",
    retrievedRule.rule_number >= 1,
  );
  TestValidator.predicate(
    "rule has created_at timestamp",
    retrievedRule.created_at !== null,
  );
  TestValidator.predicate(
    "rule has updated_at timestamp",
    retrievedRule.updated_at !== null,
  );
}
