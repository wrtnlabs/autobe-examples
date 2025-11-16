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
 * Test that members see updated rule information after a moderator modifies the
 * rule. This scenario validates that rule updates are immediately visible to
 * members, ensuring real-time consistency in community governance information
 * and that members always have access to current community guidelines.
 */
export async function test_api_member_rule_access_rule_update_propagation(
  connection: api.IConnection,
) {
  // Step 1: Create member account for rule access testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "SecurePass123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community moderator account for rule management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: "ModeratorPass123!",
        nickname: RandomGenerator.name(),
        href: "https://reddit-community.com/register",
        referrer: "https://reddit-community.com/login",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 3: Create a community for rule testing
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_name: "Technology",
        type: "public",
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Step 4: Moderator creates an initial community rule
  const initialRule =
    await api.functional.redditCommunity.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: "Be Respectful",
          description:
            "All members must maintain respectful communication. No personal attacks, harassment, or discriminatory language will be tolerated.",
          violation_consequence:
            "First offense: Warning, Repeat offenses: Temporary ban",
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(initialRule);

  // Step 5: Moderator updates the rule with new information
  const updatedRule =
    await api.functional.redditCommunity.communityModerator.communities.rules.update(
      connection,
      {
        communityName: community.name,
        ruleId: initialRule.id,
        body: {
          title: "Be Respectful and Constructive",
          description:
            "All members must maintain respectful and constructive communication. No personal attacks, harassment, discriminatory language, or off-topic discussions will be tolerated. Focus on adding value to conversations.",
          violation_consequence:
            "First offense: Warning, Second offense: 3-day ban, Repeat offenses: Permanent ban",
          rule_number: 1,
        } satisfies IRedditCommunityCommunityRule.IUpdate,
      },
    );
  typia.assert(updatedRule);

  // Step 6: Switch to member context to access the updated rule
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "SecurePass123!",
      href: "https://reddit-community.com/login",
      referrer: "https://reddit-community.com",
      ip: "127.0.0.1",
    } satisfies IRedditCommunityMember.ILoginRequest,
  });

  // Step 7: Member accesses the updated rule to verify changes are visible
  const memberViewRule =
    await api.functional.redditCommunity.member.communities.rules.at(
      connection,
      {
        communityName: community.name,
        ruleId: updatedRule.id,
      },
    );
  typia.assert(memberViewRule);

  // Step 8: Validate that the member sees the updated rule information immediately
  TestValidator.equals(
    "rule title updated",
    memberViewRule.title,
    updatedRule.title,
  );
  TestValidator.equals(
    "rule description updated",
    memberViewRule.description,
    updatedRule.description,
  );
  TestValidator.equals(
    "rule consequence updated",
    memberViewRule.violation_consequence,
    updatedRule.violation_consequence,
  );
  TestValidator.equals("rule ID matches", memberViewRule.id, updatedRule.id);
  TestValidator.equals(
    "rule number matches",
    memberViewRule.rule_number,
    updatedRule.rule_number,
  );
  TestValidator.equals(
    "community association correct",
    memberViewRule.reddit_community_community_id,
    community.id,
  );
  TestValidator.notEquals(
    "rule was actually updated",
    memberViewRule.title,
    initialRule.title,
  );
  TestValidator.notEquals(
    "description was modified",
    memberViewRule.description,
    initialRule.description,
  );
  TestValidator.notEquals(
    "consequence was updated",
    memberViewRule.violation_consequence,
    initialRule.violation_consequence,
  );
  TestValidator.equals(
    "updated timestamp changed",
    memberViewRule.updated_at,
    updatedRule.updated_at,
  );
  TestValidator.equals(
    "creation timestamp preserved",
    memberViewRule.created_at,
    initialRule.created_at,
  );
}
