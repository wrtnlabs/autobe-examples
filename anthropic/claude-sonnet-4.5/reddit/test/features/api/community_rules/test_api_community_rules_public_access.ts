import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityRule";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

/**
 * Test that community rules can be retrieved without authentication, confirming
 * public visibility.
 *
 * This test validates that community rules are transparently accessible to all
 * users (guests and members) without requiring authentication. The test creates
 * a moderator account, establishes a community, adds several rules, then
 * retrieves those rules using an unauthenticated connection to verify public
 * accessibility.
 *
 * Steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a test community
 * 3. Add multiple community rules with varied content
 * 4. Switch to unauthenticated connection (guest access)
 * 5. Retrieve community rules without authentication
 * 6. Validate all rule information is returned correctly
 */
export async function test_api_community_rules_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        nickname: RandomGenerator.name(),
        href: "https://test.example.com/join",
        referrer: "https://test.example.com/home",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community
  const communityName = `test_${RandomGenerator.alphabets(8)}`;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          rules: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create multiple community rules
  const ruleCount = 4;
  const createdRules: IRedditCommunityCommunityRule[] =
    await ArrayUtil.asyncRepeat(ruleCount, async (index) => {
      const rule: IRedditCommunityCommunityRule =
        await api.functional.redditCommunity.moderator.communities.rules.create(
          connection,
          {
            communityName: communityName,
            body: {
              title: `Rule ${index + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
              description: RandomGenerator.paragraph({ sentences: 5 }),
              rule_number: index + 1,
            } satisfies IRedditCommunityCommunityRule.ICreate,
          },
        );
      typia.assert(rule);
      return rule;
    });

  // Step 4: Create unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 5: Retrieve community rules without authentication
  const publicRulesResponse: IPageIRedditCommunityCommunityRule.ISummary =
    await api.functional.redditCommunity.communities.rules.index(
      unauthenticatedConnection,
      {
        communityName: communityName,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityRule.IRequest,
      },
    );
  typia.assert(publicRulesResponse);

  // Step 6: Validate pagination metadata
  TestValidator.equals(
    "pagination total records matches created rules count",
    publicRulesResponse.pagination.records,
    ruleCount,
  );
  TestValidator.equals(
    "pagination current page is first page",
    publicRulesResponse.pagination.current,
    0,
  );

  // Step 7: Validate all rules are present
  TestValidator.equals(
    "response data array contains all created rules",
    publicRulesResponse.data.length,
    ruleCount,
  );

  // Step 8: Validate each rule's data integrity
  await ArrayUtil.asyncForEach(createdRules, async (createdRule) => {
    const foundRule = publicRulesResponse.data.find(
      (r) => r.id === createdRule.id,
    );
    typia.assertGuard(foundRule!);

    TestValidator.equals(
      "retrieved rule title matches created rule title",
      foundRule.title,
      createdRule.title,
    );
    TestValidator.equals(
      "retrieved rule description matches created rule description",
      foundRule.description,
      createdRule.description,
    );
    TestValidator.equals(
      "retrieved rule number matches created rule number",
      foundRule.rule_number,
      createdRule.rule_number,
    );
    TestValidator.equals(
      "retrieved rule community_id matches community id",
      foundRule.community_id,
      community.id,
    );
  });
}
