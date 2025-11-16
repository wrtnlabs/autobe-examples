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
 * Test rule creation by a user without moderator privileges. This scenario
 * validates proper authorization checks by ensuring regular members cannot
 * create community rules, maintaining the integrity of community governance and
 * ensuring only authorized moderators can establish community guidelines.
 *
 * 1. Create a regular member account (non-moderator)
 * 2. Create a community using the member account
 * 3. Attempt to create a community rule as the regular member
 * 4. Verify that the rule creation fails due to insufficient privileges
 */
export async function test_api_community_rule_creation_unauthorized_user(
  connection: api.IConnection,
) {
  // Step 1: Create a regular member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const regularMember = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "password123" satisfies string & tags.MinLength<8>,
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(regularMember);

  // Step 2: Create a community using the member account
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_name: "Technology",
        type: "public",
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Attempt to create a community rule as the regular member (should fail)
  await TestValidator.error(
    "regular member should be unable to create community rules",
    async () => {
      await api.functional.redditCommunity.communityModerator.communities.rules.create(
        connection,
        {
          communityName: community.name,
          body: {
            title: "No Spam",
            description: "Spam posts are not allowed",
            violation_consequence: "Post removed",
          } satisfies IRedditCommunityCommunityRule.ICreate,
        },
      );
    },
  );
}
