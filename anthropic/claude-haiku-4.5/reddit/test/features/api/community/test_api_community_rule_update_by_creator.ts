import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test that a community creator can successfully update a rule they own.
 *
 * This test validates the complete workflow of creating a community,
 * establishing its rules, and then updating those rules as the creator. It
 * verifies that:
 *
 * - Rule updates succeed for the community creator
 * - The rule_number (ordinal position) remains immutable
 * - The created_at timestamp is preserved
 * - The updated_at timestamp is refreshed to current time
 * - All fields are correctly returned in the response
 *
 * Steps:
 *
 * 1. Create a category for community classification
 * 2. Register and authenticate member account
 * 3. Create a community with the authenticated member as creator
 * 4. Register and authenticate moderator account
 * 5. Create an initial rule in the community
 * 6. Update the rule with new title and description
 * 7. Validate the updated rule response and timestamp preservation
 */
export async function test_api_community_rule_update_by_creator(
  connection: api.IConnection,
) {
  // Step 1: Create a category for the community
  const categoryData = {
    name: "Technology",
    slug: "technology",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);

  // Step 2: Register and authenticate as member (community creator)
  const memberCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "Password123!@",
    href: "https://example.com",
    referrer: "https://example.com/referrer",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateData,
    });
  typia.assert(memberResponse);

  // Step 3: Create a community as the member creator
  const communityData = {
    name: "Tech Community",
    identifier: `tech_${RandomGenerator.alphaNumeric(5)}`,
    description: "A community for technology discussions",
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 4: Register and authenticate as moderator for rule creation
  const moderatorCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "Password123!@",
    href: "https://example.com",
    referrer: "https://example.com/referrer",
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderatorResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateData,
    });
  typia.assert(moderatorResponse);

  // Step 5: Create an initial rule in the community
  const ruleCreateData = {
    rule_number: 1,
    title: "Be Respectful",
    description: "Treat all community members with respect and courtesy",
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const createdRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: ruleCreateData,
      },
    );
  typia.assert(createdRule);

  const originalCreatedAt = createdRule.created_at;
  const originalRuleNumber = createdRule.rule_number;

  // Step 6: Switch back to member and update the rule
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberCreateData.email,
      password: memberCreateData.password,
      href: "https://example.com",
      referrer: "https://example.com/referrer",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const ruleUpdateData = {
    title: "Maintain Respect and Civility",
    description:
      "Treat all community members with respect, civility, and professionalism in all interactions",
  } satisfies ICommunityPlatformCommunityRule.IUpdate;

  const updatedRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.member.communities.rules.update(
      connection,
      {
        communityId: community.id,
        ruleId: createdRule.id,
        body: ruleUpdateData,
      },
    );
  typia.assert(updatedRule);

  // Step 7: Validate the update results
  TestValidator.equals(
    "rule_number should remain unchanged",
    updatedRule.rule_number,
    originalRuleNumber,
  );

  TestValidator.equals(
    "created_at should be preserved",
    updatedRule.created_at,
    originalCreatedAt,
  );

  TestValidator.equals(
    "title should be updated",
    updatedRule.title,
    ruleUpdateData.title,
  );

  TestValidator.equals(
    "description should be updated",
    updatedRule.description,
    ruleUpdateData.description,
  );

  TestValidator.predicate(
    "updated_at should be refreshed to a newer timestamp",
    new Date(updatedRule.updated_at) >= new Date(originalCreatedAt),
  );

  TestValidator.equals(
    "community_id should be preserved",
    updatedRule.community_platform_community_id,
    community.id,
  );
}
