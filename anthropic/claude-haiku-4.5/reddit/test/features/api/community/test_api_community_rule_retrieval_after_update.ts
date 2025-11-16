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
 * Test that rule retrieval returns updated content after a rule has been
 * modified.
 *
 * This test validates the complete rule update workflow:
 *
 * 1. Create a category for community setup
 * 2. Authenticate as member and create a community
 * 3. Authenticate as moderator to create a rule
 * 4. Retrieve the rule to confirm initial values
 * 5. Update the rule with new title and description
 * 6. Retrieve the rule again to validate updated content
 * 7. Verify audit trail: ID and rule_number unchanged, updated_at refreshed,
 *    created_at constant
 */
export async function test_api_community_rule_retrieval_after_update(
  connection: api.IConnection,
) {
  // Setup: Create administrator and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUser = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "Admin@12345",
      username: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(),
      href: "https://example.com/auth",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminUser);

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology-" + RandomGenerator.alphaNumeric(6),
          display_order: 1,
          description: "Tech discussions",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Setup: Create and authenticate member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUser = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "Member@12345",
      href: "https://example.com/auth",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberUser);

  // Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: "test-" + RandomGenerator.alphaNumeric(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Setup: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "Moderator@12345",
      href: "https://example.com/auth",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });

  // Login as moderator for rule creation
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "Moderator@12345",
      href: "https://example.com/auth",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Create initial rule
  const initialTitle = "No Spam";
  const initialDescription =
    "Do not post spam or promotional content without approval.";

  const createdRule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          rule_number: 1,
          title: initialTitle,
          description: initialDescription,
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(createdRule);

  // Verify initial rule content
  const ruleAfterCreate =
    await api.functional.communityPlatform.communities.rules.at(connection, {
      communityId: community.id,
      ruleId: createdRule.id,
    });
  typia.assert(ruleAfterCreate);

  TestValidator.equals(
    "initial rule title matches",
    ruleAfterCreate.title,
    initialTitle,
  );
  TestValidator.equals(
    "initial rule description matches",
    ruleAfterCreate.description,
    initialDescription,
  );
  TestValidator.equals("rule ID unchanged", ruleAfterCreate.id, createdRule.id);
  TestValidator.equals(
    "rule number unchanged",
    ruleAfterCreate.rule_number,
    createdRule.rule_number,
  );

  const createdAt = ruleAfterCreate.created_at;
  const createdAtTimestamp = new Date(createdAt).getTime();

  // Login as member for rule update
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "Member@12345",
      href: "https://example.com/auth",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Update the rule
  const updatedTitle = "Be Respectful";
  const updatedDescription =
    "Treat all community members with respect and courtesy in all interactions.";

  const updatedRule =
    await api.functional.communityPlatform.member.communities.rules.update(
      connection,
      {
        communityId: community.id,
        ruleId: createdRule.id,
        body: {
          title: updatedTitle,
          description: updatedDescription,
        } satisfies ICommunityPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(updatedRule);

  // Verify updated rule content through GET
  const ruleAfterUpdate =
    await api.functional.communityPlatform.communities.rules.at(connection, {
      communityId: community.id,
      ruleId: createdRule.id,
    });
  typia.assert(ruleAfterUpdate);

  // Validate updated content
  TestValidator.equals(
    "updated rule title matches",
    ruleAfterUpdate.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated rule description matches",
    ruleAfterUpdate.description,
    updatedDescription,
  );

  // Validate audit trail
  TestValidator.equals(
    "rule ID remains unchanged after update",
    ruleAfterUpdate.id,
    createdRule.id,
  );
  TestValidator.equals(
    "rule number remains unchanged after update",
    ruleAfterUpdate.rule_number,
    createdRule.rule_number,
  );
  TestValidator.equals(
    "created_at timestamp remains constant",
    ruleAfterUpdate.created_at,
    createdAt,
  );

  // Verify updated_at has been refreshed
  const updatedAtTimestamp = new Date(ruleAfterUpdate.updated_at).getTime();
  TestValidator.predicate(
    "updated_at timestamp is after created_at",
    updatedAtTimestamp > createdAtTimestamp,
  );
}
