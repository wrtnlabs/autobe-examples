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
 * Test retrieval of a rule using a different community ID than the one where it
 * was created.
 *
 * This test validates that rules are properly scoped to their parent community
 * and cannot be accessed through a different community context.
 *
 * Workflow:
 *
 * 1. Create necessary test infrastructure (categories, admin, member, moderator
 *    accounts)
 * 2. Create first community (communityA) where the rule will be created
 * 3. Create a rule in communityA
 * 4. Create second community (communityB) for cross-community access attempt
 * 5. Attempt to retrieve the rule created in communityA using communityB's ID
 * 6. Validate that the operation returns HTTP 404 Not Found
 */
export async function test_api_community_rule_retrieval_wrong_community(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/auth/admin",
        referrer: "",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create categories
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `technology_${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: RandomGenerator.alphabets(10),
        href: "http://localhost:3000/auth/member",
        referrer: "",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword: string = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphabets(10),
        href: "http://localhost:3000/auth/moderator",
        referrer: "",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 5: Create first community (communityA)
  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Community A",
          identifier: `tech_a_${RandomGenerator.alphaNumeric(8)}`,
          description: "First test community",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);

  // Step 6: Create second community (communityB)
  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Community B",
          identifier: `tech_b_${RandomGenerator.alphaNumeric(8)}`,
          description: "Second test community",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);

  // Step 7: Login as moderator to create a rule in communityA
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/auth/moderator",
      referrer: "",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 8: Create a rule in communityA
  const rule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: communityA.id,
        body: {
          rule_number: 1,
          title: "Be Respectful",
          description: "Treat all community members with respect and dignity.",
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule);

  TestValidator.equals(
    "rule belongs to communityA",
    rule.community_platform_community_id,
    communityA.id,
  );

  // Step 9: Attempt to retrieve the rule using communityB's ID - should fail with 404
  await TestValidator.error(
    "should return 404 when accessing rule from wrong community",
    async () => {
      await api.functional.communityPlatform.communities.rules.at(connection, {
        communityId: communityB.id,
        ruleId: rule.id,
      });
    },
  );

  // Step 10: Verify that the rule can be retrieved using the correct communityA ID
  const retrievedRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communities.rules.at(connection, {
      communityId: communityA.id,
      ruleId: rule.id,
    });
  typia.assert(retrievedRule);

  TestValidator.equals(
    "retrieved rule matches created rule",
    retrievedRule.id,
    rule.id,
  );
  TestValidator.equals(
    "retrieved rule belongs to communityA",
    retrievedRule.community_platform_community_id,
    communityA.id,
  );
}
