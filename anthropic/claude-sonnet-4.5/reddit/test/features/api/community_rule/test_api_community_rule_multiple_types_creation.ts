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
 * Test creating multiple community rules of different types within a single
 * community.
 *
 * This test validates that a community can have a diverse set of rules with
 * different type classifications (required, prohibited, etiquette). It creates
 * a complete workflow from community creation through rule management by
 * multiple user roles.
 *
 * Steps:
 *
 * 1. Create member account for community ownership
 * 2. Create community as member
 * 3. Create moderator account for rule management
 * 4. Create rules of each type with varying display orders
 * 5. Validate rule type classification and ordering
 */
export async function test_api_community_rule_multiple_types_creation(
  connection: api.IConnection,
) {
  // Step 1: Create member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member = await api.functional.auth.member.join(connection, {
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
  const communityName = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<25>
  >();
  const communityDescription = typia.random<
    string & tags.MinLength<10> & tags.MaxLength<500>
  >();

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: communityName,
        description: communityDescription,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create moderator account for rule creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Create rules of different types with varying display orders

  // Create a "required" type rule
  const requiredRuleTitle = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<100>
  >();
  const requiredRuleDescription = typia.random<string & tags.MaxLength<500>>();

  const requiredRule =
    await api.functional.redditLike.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          title: requiredRuleTitle,
          description: requiredRuleDescription,
          rule_type: "required",
          display_order: 1,
        } satisfies IRedditLikeCommunityRule.ICreate,
      },
    );
  typia.assert(requiredRule);

  // Create a "prohibited" type rule
  const prohibitedRuleTitle = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<100>
  >();
  const prohibitedRuleDescription = typia.random<
    string & tags.MaxLength<500>
  >();

  const prohibitedRule =
    await api.functional.redditLike.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          title: prohibitedRuleTitle,
          description: prohibitedRuleDescription,
          rule_type: "prohibited",
          display_order: 2,
        } satisfies IRedditLikeCommunityRule.ICreate,
      },
    );
  typia.assert(prohibitedRule);

  // Create an "etiquette" type rule
  const etiquetteRuleTitle = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<100>
  >();
  const etiquetteRuleDescription = typia.random<string & tags.MaxLength<500>>();

  const etiquetteRule =
    await api.functional.redditLike.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          title: etiquetteRuleTitle,
          description: etiquetteRuleDescription,
          rule_type: "etiquette",
          display_order: 3,
        } satisfies IRedditLikeCommunityRule.ICreate,
      },
    );
  typia.assert(etiquetteRule);

  // Step 5: Validate rule properties and types
  TestValidator.equals(
    "required rule type matches",
    requiredRule.rule_type,
    "required",
  );
  TestValidator.equals(
    "required rule belongs to community",
    requiredRule.community_id,
    community.id,
  );
  TestValidator.equals(
    "required rule display order",
    requiredRule.display_order,
    1,
  );

  TestValidator.equals(
    "prohibited rule type matches",
    prohibitedRule.rule_type,
    "prohibited",
  );
  TestValidator.equals(
    "prohibited rule belongs to community",
    prohibitedRule.community_id,
    community.id,
  );
  TestValidator.equals(
    "prohibited rule display order",
    prohibitedRule.display_order,
    2,
  );

  TestValidator.equals(
    "etiquette rule type matches",
    etiquetteRule.rule_type,
    "etiquette",
  );
  TestValidator.equals(
    "etiquette rule belongs to community",
    etiquetteRule.community_id,
    community.id,
  );
  TestValidator.equals(
    "etiquette rule display order",
    etiquetteRule.display_order,
    3,
  );

  // Verify all rules belong to the same community
  TestValidator.predicate(
    "all rules belong to same community",
    requiredRule.community_id === community.id &&
      prohibitedRule.community_id === community.id &&
      etiquetteRule.community_id === community.id,
  );
}
