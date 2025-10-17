import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityRule";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test the complete workflow for a moderator creating a new community rule.
 *
 * This test validates that moderators can define custom community guidelines
 * with title, description, type classification, and display ordering. The
 * workflow involves:
 *
 * 1. Create a member account and authenticate
 * 2. Create a community as that member
 * 3. Create a moderator account and authenticate
 * 4. Create a rule for the community as moderator
 * 5. Validate the rule properties match specifications
 *
 * The test confirms that rules are created with correct title (3-100
 * characters), optional description (up to 500 characters), rule type
 * (required, prohibited, or etiquette), and display order (1-15).
 */
export async function test_api_community_rule_creation_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create community as member
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const communityName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 7,
  });
  const communityDescription = RandomGenerator.paragraph({
    sentences: 15,
    wordMin: 3,
    wordMax: 7,
  });

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode,
        name: communityName,
        description: communityDescription,
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create moderator account and authenticate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 4: Create community rule as moderator
  const ruleTypes = ["required", "prohibited", "etiquette"] as const;
  const ruleType = RandomGenerator.pick(ruleTypes);
  const ruleTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 7,
  });
  const ruleDescription = RandomGenerator.paragraph({
    sentences: 20,
    wordMin: 3,
    wordMax: 7,
  });
  const displayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<15>
  >();

  const rule: IRedditLikeCommunityRule =
    await api.functional.redditLike.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          title: ruleTitle,
          description: ruleDescription,
          rule_type: ruleType,
          display_order: displayOrder,
        } satisfies IRedditLikeCommunityRule.ICreate,
      },
    );
  typia.assert(rule);

  // Step 5: Validate the created rule
  TestValidator.equals(
    "rule community_id matches",
    rule.community_id,
    community.id,
  );
  TestValidator.equals("rule title matches", rule.title, ruleTitle);
  TestValidator.equals(
    "rule description matches",
    rule.description,
    ruleDescription,
  );
  TestValidator.equals("rule type matches", rule.rule_type, ruleType);
  TestValidator.equals(
    "rule display_order matches",
    rule.display_order,
    displayOrder,
  );
}
