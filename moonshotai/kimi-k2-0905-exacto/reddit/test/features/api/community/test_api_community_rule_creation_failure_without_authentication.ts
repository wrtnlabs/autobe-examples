import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

/**
 * Test that community rule creation properly fails when attempted without
 * proper authentication. This validates the authorization workflow by ensuring
 * that community rule governance remains secure and only accessible to
 * authorized community moderators, protecting against unauthorized rule
 * modifications.
 *
 * Test steps:
 *
 * 1. Create a community moderator account to establish baseline authentication
 *    context
 * 2. Attempt to create a community rule without proper authorization (using fresh
 *    unauthenticated connection)
 * 3. Verify that the operation fails with appropriate error handling
 * 4. Ensure the authorization system correctly prevents unauthorized access
 */
export async function test_api_community_rule_creation_failure_without_authentication(
  connection: api.IConnection,
) {
  // 1. First create a community moderator account to establish that authentication is required
  // and to understand the proper authentication flow
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123",
    nickname: RandomGenerator.name(),
    href: "https://example.com/auth",
    referrer: "https://example.com/registration",
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: moderatorData,
    },
  );
  typia.assert(moderator);

  // 2. Generate test data for community rule creation
  const ruleData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 6,
    }),
    violation_consequence:
      "Posts violating this rule will be removed immediately",
  } satisfies IRedditCommunityCommunityRule.ICreate;

  // 3. Create a completely fresh connection without any authentication context
  // This properly simulates a user attempting to access protected functionality without authorization
  const unauthConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };

  // 4. Attempt to create a community rule without authentication
  // This should fail because community rules require moderator authorization
  await TestValidator.error(
    "community rule creation should fail without authentication",
    async () => {
      await api.functional.redditCommunity.communities.rules.createRule(
        unauthConnection,
        {
          communityName: "test-community",
          body: ruleData,
        },
      );
    },
  );

  // 5. Verify that authenticated creation succeeds with the established authorized connection
  // This confirms that the authentication system works correctly when proper credentials are provided
  const newRule =
    await api.functional.redditCommunity.communities.rules.createRule(
      connection,
      {
        communityName: "test-community",
        body: ruleData,
      },
    );
  typia.assert(newRule);

  // 6. Validate that the authenticated rule was created successfully
  TestValidator.equals("rule title matches", newRule.title, ruleData.title);
  TestValidator.equals(
    "rule description matches",
    newRule.description,
    ruleData.description,
  );
  TestValidator.equals(
    "rule consequence matches",
    newRule.violation_consequence,
    ruleData.violation_consequence,
  );
}
