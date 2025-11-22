import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityRule";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test registered user attempting to retrieve rule from non-existent community.
 *
 * Validates that proper error handling occurs when communityName references a
 * community that doesn't exist, ensuring system stability and appropriate error
 * responses. This test confirms the API gracefully handles invalid community
 * references while maintaining system security and providing meaningful error
 * feedback to users.
 */
export async function test_api_user_rule_retrieval_nonexistent_community(
  connection: api.IConnection,
) {
  // Step 1: Create a registered user account for authentication
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = RandomGenerator.alphaNumeric(10) + "Password1!";
  const userUsername: string = RandomGenerator.alphabets(8);

  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: userUsername,
        email: userEmail,
        password: userPassword,
        href: "https://example.com/test",
        referrer: "https://example.com/previous",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // Step 2: Attempt to retrieve a rule from a non-existent community
  const nonExistentCommunityName: string =
    "this-community-does-not-exist-" + RandomGenerator.alphaNumeric(6);
  const nonExistentRuleId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Validate that the API properly handles non-existent community requests
  await TestValidator.error(
    "retrieving rules from non-existent community should fail",
    async () => {
      return await api.functional.redditPlatform.registeredUser.communities.rules.at(
        connection,
        {
          communityName: nonExistentCommunityName,
          ruleId: nonExistentRuleId,
        },
      );
    },
  );
}
