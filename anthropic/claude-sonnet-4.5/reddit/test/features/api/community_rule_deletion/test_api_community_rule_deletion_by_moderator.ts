import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityRule";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test the complete workflow of permanently deleting a community rule by a
 * moderator.
 *
 * This test validates the rule deletion functionality by:
 *
 * 1. Creating a moderator account through registration
 * 2. Creating a community (moderator becomes primary moderator automatically)
 * 3. Creating a community rule
 * 4. Permanently deleting the rule
 * 5. Verifying the deletion was successful
 *
 * The test ensures that moderators can successfully remove rules from their
 * communities and that the deletion is permanent and immediate.
 */
export async function test_api_community_rule_deletion_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a community (moderator automatically becomes primary moderator)
  const communityData = {
    code: RandomGenerator.alphaNumeric(15),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "discussion",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create a community rule
  const ruleData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 10,
    }),
    rule_type: "required",
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<15>
    >(),
  } satisfies IRedditLikeCommunityRule.ICreate;

  const rule: IRedditLikeCommunityRule =
    await api.functional.redditLike.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: ruleData,
      },
    );
  typia.assert(rule);

  // Step 4: Permanently delete the rule
  await api.functional.redditLike.moderator.communities.rules.erase(
    connection,
    {
      communityId: community.id,
      ruleId: rule.id,
    },
  );

  // Step 5: Verify deletion by attempting to delete again (should fail)
  await TestValidator.error(
    "deleting already deleted rule should fail",
    async () => {
      await api.functional.redditLike.moderator.communities.rules.erase(
        connection,
        {
          communityId: community.id,
          ruleId: rule.id,
        },
      );
    },
  );
}
