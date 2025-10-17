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
 * Test that community rules can be retrieved publicly without authentication.
 *
 * This test validates the platform's transparency principle by ensuring that
 * community rules are accessible to all users, including unauthenticated
 * guests. This allows potential contributors to understand community standards
 * before registration or content posting.
 *
 * Test workflow:
 *
 * 1. Create a member account for community creation
 * 2. Create a community as the member
 * 3. Create a moderator account for rule management
 * 4. Create a comprehensive community rule with all details
 * 5. Create an unauthenticated connection (guest user)
 * 6. Retrieve the rule publicly without authentication
 * 7. Validate all rule details are accessible
 */
export async function test_api_community_rule_public_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create member account for community creation
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community as the member
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 15 }),
        privacy_type: "public",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create moderator account for rule management
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Create a comprehensive community rule with all details
  const ruleTypes = ["required", "prohibited", "etiquette"] as const;
  const selectedRuleType = RandomGenerator.pick(ruleTypes);

  const createdRule =
    await api.functional.redditLike.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 10 }),
          rule_type: selectedRuleType,
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<15>
          >(),
        } satisfies IRedditLikeCommunityRule.ICreate,
      },
    );
  typia.assert(createdRule);

  // Step 5: Create unauthenticated connection (guest user)
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  // Step 6: Retrieve rule details without authentication
  const publicRule = await api.functional.redditLike.communities.rules.at(
    guestConnection,
    {
      communityId: community.id,
      ruleId: createdRule.id,
    },
  );
  typia.assert(publicRule);

  // Step 7: Validate all rule details are accessible and match
  TestValidator.equals("rule ID matches", publicRule.id, createdRule.id);
  TestValidator.equals(
    "rule community ID matches",
    publicRule.community_id,
    community.id,
  );
  TestValidator.equals(
    "rule title matches",
    publicRule.title,
    createdRule.title,
  );
  TestValidator.equals(
    "rule description matches",
    publicRule.description,
    createdRule.description,
  );
  TestValidator.equals(
    "rule type matches",
    publicRule.rule_type,
    createdRule.rule_type,
  );
  TestValidator.equals(
    "rule display order matches",
    publicRule.display_order,
    createdRule.display_order,
  );
  TestValidator.equals(
    "rule created_at matches",
    publicRule.created_at,
    createdRule.created_at,
  );
  TestValidator.equals(
    "rule updated_at matches",
    publicRule.updated_at,
    createdRule.updated_at,
  );
}
