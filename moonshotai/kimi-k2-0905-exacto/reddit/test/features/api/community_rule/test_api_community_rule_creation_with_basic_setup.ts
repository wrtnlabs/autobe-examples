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
 * Test the basic workflow of creating a community rule by a community
 * moderator.
 *
 * This test validates the core functionality of establishing community
 * governance policies with valid rule structures. The workflow includes:
 *
 * 1. Creating a new community moderator account for rule creation authorization
 * 2. Creating a community to add rules to
 * 3. Creating a basic rule with title and description for the community
 *
 * This ensures that community moderators can properly establish behavioral
 * guidelines and content standards within their communities.
 */
export async function test_api_community_rule_creation_with_basic_setup(
  connection: api.IConnection,
) {
  // Step 1: Create a new community moderator account for rule creation authorization
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePassword123!",
        nickname: RandomGenerator.name(),
        href: "https://reddit-community.com/join",
        referrer: "https://reddit-community.com",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a community to add rules to
  const communityName = RandomGenerator.alphabets(8) + "_community";
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: RandomGenerator.name(2) + " Discussion Community",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_name: "Technology",
        type: "public",
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create a basic rule with title and description for the community
  const rule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: "Be respectful and constructive",
          description: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 5,
            wordMax: 10,
          }),
          violation_consequence: "Post removal and warning",
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(rule);

  // Validate the rule was created successfully with correct associations
  TestValidator.equals(
    "rule belongs to correct community",
    rule.reddit_community_community_id,
    community.id,
  );
  TestValidator.equals(
    "rule has correct title",
    rule.title,
    "Be respectful and constructive",
  );
  TestValidator.predicate(
    "rule has valid description",
    rule.description.length > 0 && rule.description.length <= 1000,
  );
  TestValidator.predicate(
    "rule has valid rule number",
    rule.rule_number >= 1 && rule.rule_number <= 15,
  );
  TestValidator.predicate(
    "rule has creation timestamp",
    rule.created_at.length > 0,
  );
  TestValidator.predicate(
    "rule has violation consequence",
    rule.violation_consequence !== undefined &&
      rule.violation_consequence.length > 0,
  );
}
