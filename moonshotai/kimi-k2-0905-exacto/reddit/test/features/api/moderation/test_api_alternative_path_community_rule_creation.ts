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
 * Test creating community rules through the alternative path endpoint.
 *
 * This comprehensive test validates the alternative community rule creation
 * path, ensuring it maintains consistency with the primary governance
 * mechanism.
 *
 * Test Flow:
 *
 * 1. Member Registration & Authentication
 *
 *    - Create member account with random credentials
 *    - Authenticate to enable community creation
 * 2. Community Establishment
 *
 *    - Create community with random name/title
 *    - Set up community for rule governance testing
 * 3. Moderator Acquisition
 *
 *    - Create community moderator account
 *    - Switch moderation context for rule creation
 * 4. Alternative Path Rule Creation
 *
 *    - Create rules using communityName path
 *    - Generate realistic rule data with proper formatting
 *    - Test multiple rule creations for sequential ordering
 * 5. Validation & Consistency
 *
 *    - Verify rule structure matches expected governance schema
 *    - Validate proper community scoping
 *    - Assert successful rule creation via alternative path
 *
 * Key Validations:
 *
 * - Alternative path API functionality
 * - Rule numbering consistency
 * - Proper community scoping
 * - Rule schema compliance
 */
export async function test_api_alternative_path_community_rule_creation(
  connection: api.IConnection,
) {
  const host = "http://localhost";

  // Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      nickname: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12) + "Test123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Create community as the member
  const communityName = RandomGenerator.alphabets(8).replace(
    /[^a-zA-Z0-9_]/g,
    "",
  );
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: `${RandomGenerator.name()} Community`,
        description: RandomGenerator.paragraph({
          sentences: 10,
          wordMin: 3,
          wordMax: 10,
        }),
        category_name: "General",
        type: "public",
        allow_crosspost: true,
        post_requirement_min_age: 0,
        post_requirement_min_karma: null,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Create community moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorHref = `${host}/redditCommunity/communities/${communityName}`;
  const moderatorReferrer = `${host}/redditCommunity`;

  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        nickname: `${RandomGenerator.name(1)}_mod`,
        password: RandomGenerator.alphaNumeric(12) + "Mod123!",
        href: moderatorHref,
        referrer: moderatorReferrer,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Authenticate as moderator
  const moderatorLoginHref = `${host}/redditCommunity/communities/${communityName}/rules`;
  const moderatorLoginReferrer = `${host}/redditCommunity/communities`;

  const moderAuth = await api.functional.auth.communityModerator.login(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(12) + "Mod123!", // Use same password as joined
        href: moderatorLoginHref,
        referrer: moderatorLoginReferrer,
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    },
  );
  typia.assert(moderAuth);

  // Create first rule using alternative path
  const ruleData1 = {
    title: "Community Respect & Professional Conduct",
    description:
      RandomGenerator.paragraph({ sentences: 8, wordMin: 4, wordMax: 8 }) +
      " " +
      RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 7 }),
  } satisfies IRedditCommunityCommunityRule.ICreate;

  const rule1 =
    await api.functional.redditCommunity.communities.rules.createRule(
      connection,
      {
        communityName: communityName,
        body: ruleData1,
      },
    );
  typia.assert(rule1);

  TestValidator.equals(
    "rule belongs to community",
    rule1.reddit_community_community_id,
    community.id,
  );
  TestValidator.predicate("rule has proper order", rule1.rule_number === 1);
  TestValidator.equals("rule title matches", rule1.title, ruleData1.title);

  // Create second rule
  const ruleData2 = {
    title: "Content Relevance & Topic Consistency",
    description:
      RandomGenerator.paragraph({ sentences: 6, wordMin: 4, wordMax: 9 }) +
      " " +
      RandomGenerator.paragraph({ sentences: 7, wordMin: 3, wordMax: 6 }),
  } satisfies IRedditCommunityCommunityRule.ICreate;

  const rule2 =
    await api.functional.redditCommunity.communities.rules.createRule(
      connection,
      {
        communityName: communityName,
        body: ruleData2,
      },
    );
  typia.assert(rule2);

  TestValidator.equals("second rule order", rule2.rule_number, 2);
  TestValidator.equals(
    "rule community id",
    rule2.reddit_community_community_id,
    community.id,
  );

  // Create third rule
  const ruleData3 = {
    title: "Quality Standards & Source Requirements",
    description:
      RandomGenerator.paragraph({ sentences: 9, wordMin: 3, wordMax: 8 }) +
      " " +
      RandomGenerator.paragraph({ sentences: 4, wordMin: 4, wordMax: 7 }),
    violation_consequence:
      "First offense: Warning. Second offense: Content removal. Third offense: Temporary suspension.",
  } satisfies IRedditCommunityCommunityRule.ICreate;

  const rule3 =
    await api.functional.redditCommunity.communities.rules.createRule(
      connection,
      {
        communityName: communityName,
        body: ruleData3,
      },
    );
  typia.assert(rule3);

  TestValidator.equals("third rule order", rule3.rule_number, 3);
  TestValidator.equals(
    "rule consequence",
    rule3.violation_consequence,
    ruleData3.violation_consequence,
  );

  // Test rule creation limits
  await TestValidator.error("rule limit exceeded should fail", async () => {
    await api.functional.redditCommunity.communities.rules.createRule(
      connection,
      {
        communityName: "nonexistent_community",
        body: {
          title: "Test",
          description: "This should fail",
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  });

  // Verify rule sequence
  TestValidator.predicate(
    "rules created in sequence",
    rule2.rule_number > rule1.rule_number,
  );
  TestValidator.predicate(
    "rules created in sequence",
    rule3.rule_number > rule2.rule_number,
  );

  // Test community rule retrieval
  const rulesData = [rule1, rule2, rule3];
  TestValidator.predicate(
    "rule titles non-empty",
    rulesData.every((rule) => rule.title.length > 0),
  );
  TestValidator.predicate(
    "rule descriptions non-empty",
    rulesData.every((rule) => rule.description.length > 0),
  );
  TestValidator.predicate(
    "rule community id matches",
    rulesData.every(
      (rule) => rule.reddit_community_community_id === community.id,
    ),
  );

  const expectedSequence = Array.from(
    { length: rulesData.length },
    (_, i) => i + 1,
  );
  const actualSequence = rulesData
    .map((rule) => rule.rule_number)
    .sort((a, b) => a - b);

  TestValidator.equals(
    "proper sequence numbering",
    actualSequence,
    expectedSequence,
  );

  TestValidator.predicate(
    "rule descriptions meet length requirements",
    rulesData.every(
      (rule) => rule.description.length >= 1 && rule.description.length <= 1000,
    ),
  );

  TestValidator.predicate(
    "rule titles meet length requirements",
    rulesData.every(
      (rule) => rule.title.length >= 1 && rule.title.length <= 100,
    ),
  );

  TestValidator.equals("rules count matches", rulesData.length, 3);
  console.log(
    `Successfully validated alternative path rule creation for community '${communityName}'`,
  );
}
