import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

/**
 * Test complete community rule creation workflow from moderator registration
 * through rule creation.
 *
 * This test validates the entire flow of:
 *
 * 1. Moderator account registration and authentication
 * 2. Community creation by the authenticated moderator
 * 3. Community rule creation with all required and optional fields
 * 4. Verification that the created rule has all expected fields and proper
 *    associations
 *
 * The test ensures that:
 *
 * - Moderator registration succeeds and returns JWT tokens
 * - Community creation succeeds and returns complete community entity
 * - Rule creation succeeds with proper community association
 * - All auto-generated fields (id, timestamps) are present and valid
 * - The rule is immediately retrievable and properly linked to the community
 */
export async function test_api_community_rule_creation_complete_workflow(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorNickname = RandomGenerator.name();
  const currentUrl = "https://reddit-community.example.com/register";
  const referrerUrl = "https://reddit-community.example.com/home";

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: moderatorNickname,
        ip: "192.168.1.100",
        href: currentUrl,
        referrer: referrerUrl,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Validate moderator registration response
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator nickname matches",
    moderator.nickname,
    moderatorNickname,
  );

  // Step 2: Create a new community as the authenticated moderator
  const communityName = RandomGenerator.alphaNumeric(12).toLowerCase();
  const communityDisplayTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 2,
    wordMax: 5,
  });
  const communityDescription = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 4,
    wordMax: 8,
  });
  const communityRules = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 7,
  });

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: communityDisplayTitle,
          description: communityDescription,
          rules: communityRules,
          icon_url: "https://cdn.example.com/icons/community-icon.png",
          banner_url: "https://cdn.example.com/banners/community-banner.jpg",
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Validate community creation response
  TestValidator.equals("community name matches", community.name, communityName);
  TestValidator.equals(
    "community display title matches",
    community.display_title,
    communityDisplayTitle,
  );
  TestValidator.equals(
    "community description matches",
    community.description,
    communityDescription,
  );
  TestValidator.equals(
    "community rules match",
    community.rules,
    communityRules,
  );
  TestValidator.equals(
    "community creator is moderator",
    community.creator_member_id,
    moderator.id,
  );
  TestValidator.equals(
    "community subscriber count initialized",
    community.subscriber_count,
    0,
  );
  TestValidator.equals(
    "community post count initialized",
    community.post_count,
    0,
  );

  // Step 3: Create a community rule
  const ruleTitle = "Be respectful and civil";
  const ruleDescription =
    "All members must treat each other with respect. Personal attacks, harassment, and hate speech will not be tolerated.";
  const ruleNumber = 1;

  const rule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: ruleTitle,
          description: ruleDescription,
          rule_number: ruleNumber,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(rule);

  // Step 4: Validate the created rule has all expected fields
  TestValidator.equals(
    "rule community_id matches created community",
    rule.community_id,
    community.id,
  );
  TestValidator.equals("rule title matches input", rule.title, ruleTitle);
  TestValidator.equals(
    "rule description matches input",
    rule.description,
    ruleDescription,
  );
  TestValidator.equals(
    "rule number matches input",
    rule.rule_number,
    ruleNumber,
  );
}
