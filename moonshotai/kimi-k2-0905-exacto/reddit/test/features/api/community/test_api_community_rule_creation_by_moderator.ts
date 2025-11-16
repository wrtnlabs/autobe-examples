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
 * Test successful creation of a community rule by an authenticated community
 * moderator.
 *
 * This test validates the complete rule creation workflow including sequential
 * rule numbering, proper community scoping, and rule metadata assignment. The
 * test creates a community moderator account, establishes a community, then
 * creates a rule with title, description, and violation consequences, verifying
 * all rule properties are correctly stored and returned.
 *
 * The workflow involves multi-actor authentication setup where a member creates
 * a community, then a community moderator creates rules within that community.
 * This ensures proper role separation and community scoping functionality.
 *
 * 1. Create a community moderator account for rule creation
 * 2. Create a member account for community creation
 * 3. Member creates a community where rules will be established
 * 4. Set up community moderator authentication
 * 5. Create a community rule with comprehensive properties
 * 6. Validate the rule was created with correct metadata and scoping
 */
export async function test_api_community_rule_creation_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account and authenticate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        nickname: RandomGenerator.name(),
        password: "SecurePass123!",
        href: "https://reddit-community.example.com/join",
        referrer: "https://reddit-community.example.com/login",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 2: Create member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      nickname: RandomGenerator.name(),
      password: "SecurePass123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Member creates a community
  // Switch to member authentication first
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "SecurePass123!",
      href: "https://reddit-community.example.com/login",
      referrer: "https://reddit-community.example.com/welcome",
    } satisfies IRedditCommunityMember.ILoginRequest,
  });

  // Generate unique community name with proper formatting
  const communityName = `${RandomGenerator.alphabets(10)}_${RandomGenerator.alphabets(5)}`;
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_name: RandomGenerator.pick([
          "Tech",
          "Lifestyle",
          "Gaming",
          "Education",
        ] as const),
        type: RandomGenerator.pick([
          "public",
          "restricted",
          "private",
        ] as const),
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Step 4: Switch back to community moderator authentication
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "SecurePass123!",
      href: "https://reddit-community.example.com/moderator/dashboard",
      referrer: "https://reddit-community.example.com/panel",
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 5: Create community rule with comprehensive properties
  const ruleTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 15,
  });
  const ruleDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });
  const violationConsequence = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 6,
    wordMax: 12,
  });

  const rule =
    await api.functional.redditCommunity.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: ruleTitle,
          description: ruleDescription,
          violation_consequence: violationConsequence,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(rule);

  // Step 6: Validate rule creation success
  TestValidator.equals("rule title matches request", rule.title, ruleTitle);
  TestValidator.equals(
    "rule description matches request",
    rule.description,
    ruleDescription,
  );
  TestValidator.equals(
    "rule violation consequence matches request",
    rule.violation_consequence,
    violationConsequence,
  );
  TestValidator.equals(
    "rule community ID matches the target community",
    rule.reddit_community_community_id,
    community.id,
  );
  TestValidator.predicate("rule has valid UUID identifier", () =>
    typia.is<string & tags.Format<"uuid">>(rule.id),
  );
  TestValidator.predicate(
    "rule number is within valid range (1-15)",
    () => rule.rule_number >= 1 && rule.rule_number <= 15,
  );
  TestValidator.predicate("rule creation timestamp is valid", () =>
    typia.is<string & tags.Format<"date-time">>(rule.created_at),
  );
  TestValidator.predicate("rule update timestamp is valid", () =>
    typia.is<string & tags.Format<"date-time">>(rule.updated_at),
  );
}
