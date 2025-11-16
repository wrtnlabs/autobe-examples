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
 * Validates partial field updates for community rules.
 *
 * Tests that the PUT endpoint supports partial updates where only specific
 * fields are provided in the request body. The test creates a rule with initial
 * title and description, then performs two separate partial updates:
 *
 * 1. Update only the title while omitting description (verify description
 *    unchanged)
 * 2. Update only the description while omitting title (verify title unchanged)
 *
 * This validates that the API correctly handles partial payloads and does not
 * require all fields to be present in update requests.
 *
 * Steps:
 *
 * 1. Create administrator account and authenticate
 * 2. Create category for community classification
 * 3. Authenticate as member and create community
 * 4. Authenticate as moderator and create rule
 * 5. Perform first partial update (title only) and verify description unchanged
 * 6. Perform second partial update (description only) and verify title unchanged
 * 7. Retrieve final rule and confirm both fields match expectations
 */
export async function test_api_community_rule_update_partial_update(
  connection: api.IConnection,
) {
  // 1. Create administrator account and authenticate
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        name: "Test Administrator",
        href: "https://example.com/admin",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // 2. Create category for community classification
  const categorySlug = `category_${RandomGenerator.alphaNumeric(6)}`;
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: `Test Category ${RandomGenerator.alphaNumeric(4)}`,
          slug: categorySlug,
          display_order: 1,
          description: "Test category for rule updates",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Authenticate as member and create community
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: `member_${RandomGenerator.alphaNumeric(6)}`,
      password: "MemberPass123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Test Community ${RandomGenerator.alphaNumeric(4)}`,
          identifier: `community_${RandomGenerator.alphaNumeric(6)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: categorySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Authenticate as moderator and create rule
  const moderatorEmail = `moderator_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: `moderator_${RandomGenerator.alphaNumeric(6)}`,
      password: "ModeratorPass123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  const initialTitle = "No Harassment";
  const initialDescription =
    "Do not target, insult, or mock other community members. Respectful disagreement is welcome.";

  const rule =
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
  typia.assert(rule);

  TestValidator.equals("initial rule title matches", rule.title, initialTitle);
  TestValidator.equals(
    "initial rule description matches",
    rule.description,
    initialDescription,
  );

  // 5. Perform first partial update (title only) - omit description
  const updatedTitle = "Be Respectful";
  const titleOnlyUpdate =
    await api.functional.communityPlatform.member.communities.rules.update(
      connection,
      {
        communityId: community.id,
        ruleId: rule.id,
        body: {
          title: updatedTitle,
        } satisfies ICommunityPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(titleOnlyUpdate);

  TestValidator.equals(
    "title updated correctly in partial update",
    titleOnlyUpdate.title,
    updatedTitle,
  );
  TestValidator.equals(
    "description unchanged after title-only update",
    titleOnlyUpdate.description,
    initialDescription,
  );

  // 6. Perform second partial update (description only) - omit title
  const updatedDescription =
    "Treat all members with respect and dignity. Personal attacks are not tolerated.";
  const descriptionOnlyUpdate =
    await api.functional.communityPlatform.member.communities.rules.update(
      connection,
      {
        communityId: community.id,
        ruleId: rule.id,
        body: {
          description: updatedDescription,
        } satisfies ICommunityPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(descriptionOnlyUpdate);

  TestValidator.equals(
    "title unchanged after description-only update",
    descriptionOnlyUpdate.title,
    updatedTitle,
  );
  TestValidator.equals(
    "description updated correctly in partial update",
    descriptionOnlyUpdate.description,
    updatedDescription,
  );

  // 7. Verify both fields are correctly persisted
  TestValidator.equals(
    "final title matches second update",
    descriptionOnlyUpdate.title,
    updatedTitle,
  );
  TestValidator.equals(
    "final description matches second update",
    descriptionOnlyUpdate.description,
    updatedDescription,
  );
}
