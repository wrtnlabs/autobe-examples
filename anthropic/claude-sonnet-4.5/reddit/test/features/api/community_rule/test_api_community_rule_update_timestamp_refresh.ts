import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

/**
 * Test that updating a community rule correctly refreshes the updated_at
 * timestamp while preserving created_at.
 *
 * This test validates proper audit trail maintenance for rule modifications by
 * ensuring:
 *
 * 1. The created_at timestamp remains unchanged after updates
 * 2. The updated_at timestamp is refreshed to reflect the modification time
 * 3. The updated_at timestamp is always greater than or equal to created_at
 *
 * Test Flow:
 *
 * 1. Create moderator account for rule modification tracking
 * 2. Create community for timestamp validation
 * 3. Create rule to track timestamp changes during updates
 * 4. Record initial timestamps (created_at and updated_at)
 * 5. Wait briefly to ensure detectable timestamp difference
 * 6. Update the rule with new data
 * 7. Verify created_at is preserved and updated_at is refreshed
 */
export async function test_api_community_rule_update_timestamp_refresh(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create community with valid name pattern (lowercase alphanumeric + underscore)
  const communityName = RandomGenerator.alphabets(10);
  const communityData = {
    name: communityName,
    display_title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create rule
  const ruleData = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    rule_number: typia.random<number & tags.Type<"int32">>(),
  } satisfies IRedditCommunityCommunityRule.ICreate;

  const createdRule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: ruleData,
      },
    );
  typia.assert(createdRule);

  // Step 4: Record initial timestamps
  const originalCreatedAt = createdRule.created_at;
  const originalUpdatedAt = createdRule.updated_at;

  // Step 5: Wait briefly to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 6: Update the rule
  const updateData = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IRedditCommunityCommunityRule.IUpdate;

  const updatedRule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.update(
      connection,
      {
        communityName: community.name,
        ruleId: createdRule.id,
        body: updateData,
      },
    );
  typia.assert(updatedRule);

  // Step 7: Verify timestamp behavior
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedRule.created_at,
    originalCreatedAt,
  );

  TestValidator.predicate(
    "updated_at should be different from original",
    updatedRule.updated_at !== originalUpdatedAt,
  );

  TestValidator.predicate(
    "updated_at should be greater than or equal to created_at",
    new Date(updatedRule.updated_at).getTime() >=
      new Date(updatedRule.created_at).getTime(),
  );
}
