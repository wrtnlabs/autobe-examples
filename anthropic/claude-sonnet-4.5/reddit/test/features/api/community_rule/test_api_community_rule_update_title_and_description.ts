import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityRule";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test updating a community rule's title and description by a moderator.
 *
 * This test validates the complete workflow of rule content refinement:
 *
 * 1. Register a moderator account for authentication
 * 2. Create a community (auto-assigns creator as primary moderator)
 * 3. Create an initial rule with title and description
 * 4. Update the rule with new title and description
 * 5. Verify the updated rule reflects changes while preserving rule ID
 */
export async function test_api_community_rule_update_title_and_description(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // 2. Create community (moderator becomes primary moderator automatically)
  const communityData = {
    code: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<25> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">
    >(),
    name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
    description: typia.random<
      string & tags.MinLength<10> & tags.MaxLength<500>
    >(),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // 3. Create initial rule with title and description
  const initialRuleData = {
    title: "Original Rule Title",
    description:
      "This is the original description of the rule that will be updated.",
    rule_type: "required",
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<15>
    >(),
  } satisfies IRedditLikeCommunityRule.ICreate;

  const createdRule: IRedditLikeCommunityRule =
    await api.functional.redditLike.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: initialRuleData,
      },
    );
  typia.assert(createdRule);

  // Verify initial rule data
  TestValidator.equals(
    "initial rule title matches",
    createdRule.title,
    initialRuleData.title,
  );
  TestValidator.equals(
    "initial rule description matches",
    createdRule.description,
    initialRuleData.description,
  );

  // 4. Update the rule with new title and description
  const updateRuleData = {
    title: "Updated Rule Title - Refined for Clarity",
    description:
      "This is the updated description with improved wording to help users understand the rule better.",
  } satisfies IRedditLikeCommunityRule.IUpdate;

  const updatedRule: IRedditLikeCommunityRule =
    await api.functional.redditLike.moderator.communities.rules.update(
      connection,
      {
        communityId: community.id,
        ruleId: createdRule.id,
        body: updateRuleData,
      },
    );
  typia.assert(updatedRule);

  // 5. Validate the updated rule
  TestValidator.equals(
    "rule ID remains unchanged",
    updatedRule.id,
    createdRule.id,
  );
  TestValidator.equals(
    "rule title updated correctly",
    updatedRule.title,
    updateRuleData.title,
  );
  TestValidator.equals(
    "rule description updated correctly",
    updatedRule.description,
    updateRuleData.description,
  );
  TestValidator.equals(
    "community ID remains unchanged",
    updatedRule.community_id,
    community.id,
  );
  TestValidator.equals(
    "rule type remains unchanged",
    updatedRule.rule_type,
    initialRuleData.rule_type,
  );
  TestValidator.equals(
    "display order remains unchanged",
    updatedRule.display_order,
    initialRuleData.display_order,
  );

  // Verify updated_at timestamp is refreshed (should be different from created_at)
  TestValidator.predicate(
    "updated_at timestamp is refreshed",
    new Date(updatedRule.updated_at).getTime() >=
      new Date(createdRule.created_at).getTime(),
  );
}
