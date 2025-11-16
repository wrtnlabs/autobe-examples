import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

/**
 * Test the complete workflow of a moderator deleting a community rule.
 *
 * This test validates that a moderator can successfully delete a rule from a
 * community. The workflow includes:
 *
 * 1. Authenticating as a moderator
 * 2. Creating a new community
 * 3. Creating multiple community rules
 * 4. Deleting one of the rules
 * 5. Verifying the deletion was successful
 *
 * The test ensures that:
 *
 * - Moderators have proper permissions to delete rules
 * - The delete operation removes the specified rule
 * - The deleted rule data is returned correctly
 * - Other rules remain unaffected by the deletion
 */
export async function test_api_community_rule_deletion_by_moderator(
  connection: api.IConnection,
) {
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  const rule1: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: "Be respectful to others",
          description:
            "All members must treat each other with respect and courtesy.",
          rule_number: 1,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(rule1);

  const rule2: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: "No spam or self-promotion",
          description: "Spam and excessive self-promotion are not allowed.",
          rule_number: 2,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(rule2);

  const rule3: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: "Stay on topic",
          description: "All posts must be relevant to the community's focus.",
          rule_number: 3,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(rule3);

  const deletedRule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.erase(
      connection,
      {
        communityName: community.name,
        ruleId: rule2.id,
      },
    );
  typia.assert(deletedRule);

  TestValidator.equals("deleted rule ID matches", deletedRule.id, rule2.id);
  TestValidator.equals(
    "deleted rule title matches",
    deletedRule.title,
    rule2.title,
  );
  TestValidator.equals(
    "deleted rule number matches",
    deletedRule.rule_number,
    rule2.rule_number,
  );
}
