import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test community creation with visibility configuration options.
 *
 * This test validates the community creation API with different visibility
 * settings. It creates a member account, an administrative account, and a
 * category, then tests community creation with both public and private
 * visibility settings. The test verifies that visibility configurations are
 * properly stored and returned in API responses, ensuring community creators
 * can control initial access permissions and post creation restrictions.
 *
 * Test workflow:
 *
 * 1. Create member account for community creation
 * 2. Create administrator account to set up categories
 * 3. Create a community category
 * 4. Create public community with open post creation
 * 5. Validate public community is discoverable with correct settings
 * 6. Create private community with moderator-only post creation
 * 7. Validate private community settings are correctly stored
 * 8. Verify visibility settings persist in API responses
 */
export async function test_api_community_creation_with_visibility_settings(
  connection: api.IConnection,
) {
  // Step 1: Create member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAccount = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberAccount);
  TestValidator.equals(
    "member account created",
    memberAccount.id !== undefined,
    true,
  );

  // Step 2: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(2),
    href: "http://localhost:3000/admin",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminAccount = await api.functional.auth.administrator.join(
    connection,
    {
      body: adminData,
    },
  );
  typia.assert(adminAccount);

  // Switch to admin context for category creation
  connection.headers ??= {};
  connection.headers.Authorization = adminAccount.token.access;

  // Step 3: Create a community category
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: `category-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "category created successfully",
    category.slug,
    categoryData.slug,
  );

  // Switch back to member context for community creation
  connection.headers.Authorization = memberAccount.token.access;

  // Step 4: Create public community with open post creation
  const publicCommunityData = {
    name: `Public ${RandomGenerator.name(2)}`,
    identifier: `public_${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const publicCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: publicCommunityData,
      },
    );
  typia.assert(publicCommunity);

  // Step 5: Validate public community settings
  TestValidator.equals(
    "public community visibility",
    publicCommunity.visibility,
    "public",
  );
  TestValidator.equals(
    "public community identifier",
    publicCommunity.identifier,
    publicCommunityData.identifier,
  );
  TestValidator.equals(
    "public community post restriction",
    publicCommunity.post_creation_restriction,
    "open_to_all",
  );
  TestValidator.equals(
    "public community post type",
    publicCommunity.post_type_restriction,
    "all_types",
  );
  TestValidator.predicate(
    "public community has creator",
    publicCommunity.creator.id === memberAccount.id,
  );
  TestValidator.predicate(
    "public community has category",
    publicCommunity.category.slug === category.slug,
  );

  // Step 6: Create private community with moderator-only post creation
  const privateCommunityData = {
    name: `Private ${RandomGenerator.name(2)}`,
    identifier: `private_${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "private" as const,
    post_creation_restriction: "moderators_only" as const,
    post_type_restriction: "text_and_images" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const privateCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: privateCommunityData,
      },
    );
  typia.assert(privateCommunity);

  // Step 7: Validate private community settings
  TestValidator.equals(
    "private community visibility",
    privateCommunity.visibility,
    "private",
  );
  TestValidator.equals(
    "private community identifier",
    privateCommunity.identifier,
    privateCommunityData.identifier,
  );
  TestValidator.equals(
    "private community post restriction",
    privateCommunity.post_creation_restriction,
    "moderators_only",
  );
  TestValidator.equals(
    "private community post type",
    privateCommunity.post_type_restriction,
    "text_and_images",
  );
  TestValidator.predicate(
    "private community has creator",
    privateCommunity.creator.id === memberAccount.id,
  );
  TestValidator.predicate(
    "private community has category",
    privateCommunity.category.slug === category.slug,
  );

  // Step 8: Verify visibility differences between communities
  TestValidator.notEquals(
    "communities have different visibility",
    publicCommunity.visibility,
    privateCommunity.visibility,
  );
  TestValidator.notEquals(
    "communities have different post restrictions",
    publicCommunity.post_creation_restriction,
    privateCommunity.post_creation_restriction,
  );
  TestValidator.notEquals(
    "communities have different identifiers",
    publicCommunity.identifier,
    privateCommunity.identifier,
  );

  // Final validation: Verify subscriber count starts at 1 (creator)
  TestValidator.equals(
    "public community initial subscribers",
    publicCommunity.subscriber_count,
    1,
  );
  TestValidator.equals(
    "private community initial subscribers",
    privateCommunity.subscriber_count,
    1,
  );
}
