import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

/**
 * Test deleting the last remaining rule in a community to ensure proper edge
 * case handling.
 *
 * This test validates that when a community has only one rule and that rule is
 * deleted, the system handles the transition to an empty ruleset gracefully
 * without errors. The community should remain valid and operational even with
 * no rules defined.
 *
 * Steps:
 *
 * 1. Register and authenticate as a moderator
 * 2. Create a new community with initial configuration
 * 3. Create a single community rule
 * 4. Delete that rule (the last remaining rule)
 * 5. Validate successful deletion and response integrity
 */
export async function test_api_community_rule_deletion_last_remaining_rule(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    nickname: RandomGenerator.name(),
    href: "https://reddit-clone.example.com/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://reddit-clone.example.com/home" satisfies string &
      tags.Format<"uri">,
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a new community
  const communityName = RandomGenerator.alphabets(15);
  const communityData = {
    name: communityName,
    display_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    rules: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    icon_url: "https://example.com/icon.png" satisfies string &
      tags.Format<"uri">,
    banner_url: "https://example.com/banner.jpg" satisfies string &
      tags.Format<"uri">,
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create a single community rule (this will be the only/last rule)
  const ruleData = {
    title: "Be respectful to all members",
    description:
      "Treat everyone with kindness and respect. No harassment, hate speech, or personal attacks will be tolerated.",
    rule_number: 1,
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

  // Validate the created rule
  TestValidator.equals("rule title matches", createdRule.title, ruleData.title);
  TestValidator.equals(
    "rule number is 1",
    createdRule.rule_number,
    ruleData.rule_number,
  );
  TestValidator.equals(
    "rule belongs to community",
    createdRule.community_id,
    community.id,
  );

  // Step 4: Delete the last remaining rule
  const deletedRule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.erase(
      connection,
      {
        communityName: community.name,
        ruleId: createdRule.id,
      },
    );
  typia.assert(deletedRule);

  // Step 5: Validate successful deletion
  TestValidator.equals(
    "deleted rule ID matches",
    deletedRule.id,
    createdRule.id,
  );
  TestValidator.equals(
    "deleted rule title matches",
    deletedRule.title,
    createdRule.title,
  );
  TestValidator.equals(
    "deleted rule community ID matches",
    deletedRule.community_id,
    community.id,
  );
  TestValidator.predicate(
    "deletion response is valid",
    deletedRule.id === createdRule.id,
  );
}
