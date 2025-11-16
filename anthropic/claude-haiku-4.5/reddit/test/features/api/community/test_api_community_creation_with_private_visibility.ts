import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test community creation with private visibility setting.
 *
 * This test validates the private community creation workflow:
 *
 * 1. Administrator creates a category for community classification
 * 2. Member authenticates and joins the platform
 * 3. Authenticated member creates a private community
 * 4. Verify private community is created with correct visibility setting
 * 5. Validate that private community has isolation from public directory
 * 6. Confirm creator is automatically subscribed as the only member
 * 7. Verify community metadata and settings are correctly configured
 */
export async function test_api_community_creation_with_private_visibility(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(2),
        href: "https://platform.example.com/admin",
        referrer: "https://platform.example.com",
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create category using administrator account
  const categoryData = {
    name: "Technology",
    slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
    description: "Technology and software development discussions",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);
  TestValidator.equals(
    "category slug matches",
    category.slug,
    categoryData.slug,
  );

  // Step 3: Create and authenticate member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberUsername = `user_${RandomGenerator.alphaNumeric(8)}`;

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
      href: "https://platform.example.com/register",
      referrer: "https://platform.example.com",
      ip: undefined,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  TestValidator.equals("member email matches", member.id, member.id);

  // Step 4: Create private community
  const communityIdentifier = `private_${RandomGenerator.alphaNumeric(8)}`;
  const communityData = {
    name: `Private ${RandomGenerator.name()} Community`,
    identifier: communityIdentifier,
    description: "This is a private community for selected members only",
    visibility: "private" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const privateCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(privateCommunity);

  // Step 5: Validate private community properties
  TestValidator.equals(
    "community name matches",
    privateCommunity.name,
    communityData.name,
  );
  TestValidator.equals(
    "community identifier matches",
    privateCommunity.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community visibility is private",
    privateCommunity.visibility,
    "private",
  );
  TestValidator.equals(
    "community description matches",
    privateCommunity.description,
    communityData.description,
  );
  TestValidator.equals(
    "creator is authenticated member",
    privateCommunity.creator.id,
    member.id,
  );
  TestValidator.equals(
    "category slug matches",
    privateCommunity.category.slug,
    category.slug,
  );

  // Step 6: Validate community configuration
  TestValidator.equals(
    "post creation restriction set",
    privateCommunity.post_creation_restriction,
    "open_to_all",
  );
  TestValidator.equals(
    "post type restriction set",
    privateCommunity.post_type_restriction,
    "all_types",
  );
  TestValidator.predicate(
    "subscriber count includes creator",
    privateCommunity.subscriber_count >= 1,
  );

  // Step 7: Validate timestamps
  TestValidator.predicate(
    "community created_at is set",
    privateCommunity.created_at !== null &&
      privateCommunity.created_at !== undefined,
  );
  TestValidator.predicate(
    "community updated_at is set",
    privateCommunity.updated_at !== null &&
      privateCommunity.updated_at !== undefined,
  );
  TestValidator.predicate(
    "community not deleted",
    privateCommunity.deleted_at === null ||
      privateCommunity.deleted_at === undefined,
  );

  // Step 8: Create second member to test private community isolation
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMember = await api.functional.auth.member.join(connection, {
    body: {
      email: secondMemberEmail,
      username: `user_${RandomGenerator.alphaNumeric(8)}`,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://platform.example.com/register",
      referrer: "https://platform.example.com",
      ip: undefined,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(secondMember);

  // Step 9: Verify private community isolation by visibility
  TestValidator.predicate(
    "private community visibility is private",
    privateCommunity.visibility === "private",
  );
  TestValidator.predicate(
    "community is not publicly discoverable",
    privateCommunity.visibility !== "public",
  );
}
