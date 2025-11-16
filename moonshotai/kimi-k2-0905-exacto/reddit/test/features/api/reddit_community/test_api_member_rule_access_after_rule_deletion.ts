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
 * Test member access to a community rule after it has been deleted by a
 * moderator. This scenario validates that deleted rules are no longer
 * accessible to members, ensuring proper data consistency and governance
 * workflow implementation.
 *
 * The test workflow includes:
 *
 * 1. Create member and moderator accounts
 * 2. Create a community for rule testing (as member)
 * 3. Create a rule within the community (as moderator)
 * 4. Delete the rule using moderator privileges
 * 5. Attempt to access the deleted rule as a member
 * 6. Validate proper error handling for deleted rules
 */
export async function test_api_member_rule_access_after_rule_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create member account for rule access testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      nickname: RandomGenerator.name(),
      password: "TestPassword123!",
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
        nickname: RandomGenerator.name(),
        password: "TestPassword123!",
        href: "https://example.com/moderator-join",
        referrer: "https://example.com/landing",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 3: Create a community for rule testing
  const communityName = RandomGenerator.pick([
    "tech_discussions",
    "coding_help",
    "web_dev",
  ] as const);
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: RandomGenerator.name(3),
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

  // Step 4: Create a rule within the community
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "TestPassword123!",
      href: "https://example.com/moderator-login",
      referrer: "https://example.com/landing",
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const rule =
    await api.functional.redditCommunity.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: "Be respectful to others",
          description:
            "All members must maintain respectful communication and avoid personal attacks, harassment, or discriminatory language.",
          violation_consequence:
            "Warning followed by temporary suspension for repeated violations",
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(rule);

  // Step 5: Delete the rule using moderator privileges
  await api.functional.redditCommunity.communityModerator.communities.rules.erase(
    connection,
    {
      communityName: community.name,
      ruleId: rule.id,
    },
  );

  // Step 6: Switch back to member account and attempt to access the deleted rule
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "https://example.com/member-login",
      referrer: "https://example.com/landing",
      ip: "192.168.1.1",
    } satisfies IRedditCommunityMember.ILoginRequest,
  });

  // Step 7: Attempt to access the deleted rule - should result in error
  await TestValidator.error(
    "deleted rule should not be accessible",
    async () => {
      await api.functional.redditCommunity.member.communities.rules.at(
        connection,
        {
          communityName: community.name,
          ruleId: rule.id,
        },
      );
    },
  );
}
