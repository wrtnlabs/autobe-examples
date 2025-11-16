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
 * Test rule title update with length validation constraints (5-50 characters).
 *
 * Validates that the API properly enforces title length requirements when
 * updating community rules. Tests both invalid boundary cases (too short/too
 * long) and valid boundary cases (exact minimums/maximums) to ensure
 * comprehensive validation.
 *
 * Setup process:
 *
 * 1. Create administrator account for category creation
 * 2. Create community category
 * 3. Create member account for community creation
 * 4. Create community
 * 5. Create moderator account for rule creation
 * 6. Create initial rule with valid title
 *
 * Test cases:
 *
 * 1. Attempt update with 4-character title (too short) - should fail with HTTP 400
 * 2. Attempt update with 51-character title (too long) - should fail with HTTP 400
 * 3. Update with exactly 5-character title (minimum valid) - should succeed
 * 4. Update with exactly 50-character title (maximum valid) - should succeed
 * 5. Verify final rule state matches the last valid update
 */
export async function test_api_community_rule_update_title_validation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "https://example.com/auth",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech-${RandomGenerator.alphaNumeric(8)}`,
          display_order: 1,
          description: "Technology and software communities",
          icon_url: "https://example.com/tech-icon.png",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphaNumeric(8)}`,
        password: "MemberPassword123!",
        href: "https://example.com/auth",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create community (as member)
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: `tech_${RandomGenerator.alphaNumeric(8)}`,
          description: "A community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create moderator account for rule creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
      password: "ModeratorPassword123!",
      href: "https://example.com/auth",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });

  // Step 6: Create initial rule (as moderator)
  const rule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          rule_number: 1,
          title: "Be Respectful",
          description: "Treat all members with respect and courtesy",
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule);

  // Switch back to member context for rule updates
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      href: "https://example.com/auth",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Test Case 1: Attempt update with 4-character title (too short) - should fail
  await TestValidator.error(
    "4-character title should fail with HTTP 400",
    async () => {
      await api.functional.communityPlatform.member.communities.rules.update(
        connection,
        {
          communityId: community.id,
          ruleId: rule.id,
          body: {
            title: "Test", // 4 characters - violates minimum of 5
          } satisfies ICommunityPlatformCommunityRule.IUpdate,
        },
      );
    },
  );

  // Test Case 2: Attempt update with 51-character title (too long) - should fail
  await TestValidator.error(
    "51-character title should fail with HTTP 400",
    async () => {
      const longTitle = "A".repeat(51); // 51 characters - violates maximum of 50
      await api.functional.communityPlatform.member.communities.rules.update(
        connection,
        {
          communityId: community.id,
          ruleId: rule.id,
          body: {
            title: longTitle,
          } satisfies ICommunityPlatformCommunityRule.IUpdate,
        },
      );
    },
  );

  // Test Case 3: Update with exactly 5-character title (minimum valid)
  const minValidTitle = "Exact"; // 5 characters
  const minUpdate: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.member.communities.rules.update(
      connection,
      {
        communityId: community.id,
        ruleId: rule.id,
        body: {
          title: minValidTitle,
          description: "Updated with minimum valid title length",
        } satisfies ICommunityPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(minUpdate);
  TestValidator.equals(
    "5-character title should be accepted",
    minUpdate.title,
    minValidTitle,
  );

  // Test Case 4: Update with exactly 50-character title (maximum valid)
  const maxValidTitle = "A".repeat(50); // 50 characters
  const maxUpdate: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.member.communities.rules.update(
      connection,
      {
        communityId: community.id,
        ruleId: rule.id,
        body: {
          title: maxValidTitle,
          description: "Updated with maximum valid title length",
        } satisfies ICommunityPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(maxUpdate);
  TestValidator.equals(
    "50-character title should be accepted",
    maxUpdate.title,
    maxValidTitle,
  );

  // Verify final rule state
  TestValidator.equals(
    "final rule should have maximum length title",
    maxUpdate.title.length,
    50,
  );
}
