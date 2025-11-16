import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test creating communities with different visibility settings.
 *
 * This test validates that community creation works correctly with both public
 * and private visibility options. It creates one community with
 * visibility='public' and another with visibility='private', then verifies that
 * both are created successfully with the correct visibility settings.
 *
 * Steps:
 *
 * 1. Create administrator account and set up a category
 * 2. Create member account for community creation
 * 3. Create a public community and validate visibility settings
 * 4. Create a private community and validate visibility settings
 * 5. Verify both communities have correct properties and visibility
 */
export async function test_api_community_creation_privacy_options(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@admin.test`;
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: `admin_${RandomGenerator.alphaNumeric(8)}`,
      name: `Admin User ${RandomGenerator.alphaNumeric(4)}`,
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a category as administrator
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: `Tech Category ${RandomGenerator.alphaNumeric(6)}`,
          slug: `tech-${RandomGenerator.alphaNumeric(8)}`.toLowerCase(),
          display_order: 1,
          description: "Technology and programming discussions",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for community creation
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: `member_${RandomGenerator.alphaNumeric(8)}`,
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Switch to member account by logging in with correct password
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000/dashboard",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 5: Create public community
  const publicCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Public Community ${RandomGenerator.alphaNumeric(6)}`,
          identifier: `public_${RandomGenerator.alphaNumeric(8)}`.toLowerCase(),
          description: "A public community for discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(publicCommunity);

  // Validate public community properties
  TestValidator.equals(
    "public community visibility",
    publicCommunity.visibility,
    "public",
  );
  TestValidator.predicate(
    "public community has creator",
    publicCommunity.creator !== null && publicCommunity.creator !== undefined,
  );
  TestValidator.predicate(
    "public community has category",
    publicCommunity.category !== null && publicCommunity.category !== undefined,
  );
  TestValidator.equals(
    "public community initial subscriber count",
    publicCommunity.subscriber_count,
    1,
  );
  TestValidator.equals(
    "public community initial post count",
    publicCommunity.post_count,
    0,
  );
  TestValidator.equals(
    "public community initial comment count",
    publicCommunity.comment_count,
    0,
  );

  // Step 6: Create private community
  const privateCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Private Community ${RandomGenerator.alphaNumeric(6)}`,
          identifier:
            `private_${RandomGenerator.alphaNumeric(8)}`.toLowerCase(),
          description: "A private community for restricted discussions",
          visibility: "private",
          post_creation_restriction: "moderators_only",
          post_type_restriction: "text_only",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(privateCommunity);

  // Validate private community properties
  TestValidator.equals(
    "private community visibility",
    privateCommunity.visibility,
    "private",
  );
  TestValidator.predicate(
    "private community has creator",
    privateCommunity.creator !== null && privateCommunity.creator !== undefined,
  );
  TestValidator.predicate(
    "private community has category",
    privateCommunity.category !== null &&
      privateCommunity.category !== undefined,
  );
  TestValidator.equals(
    "private community initial subscriber count",
    privateCommunity.subscriber_count,
    1,
  );
  TestValidator.equals(
    "private community initial post count",
    privateCommunity.post_count,
    0,
  );
  TestValidator.equals(
    "private community initial comment count",
    privateCommunity.comment_count,
    0,
  );

  // Step 7: Validate visibility settings are different
  TestValidator.notEquals(
    "communities have different visibility",
    publicCommunity.visibility,
    privateCommunity.visibility,
  );

  // Step 8: Validate both communities have proper structure
  TestValidator.predicate(
    "public community has valid identifier",
    publicCommunity.identifier.length >= 3 &&
      publicCommunity.identifier.length <= 32,
  );
  TestValidator.predicate(
    "private community has valid identifier",
    privateCommunity.identifier.length >= 3 &&
      privateCommunity.identifier.length <= 32,
  );
  TestValidator.predicate(
    "public community has valid name",
    publicCommunity.name.length >= 3 && publicCommunity.name.length <= 100,
  );
  TestValidator.predicate(
    "private community has valid name",
    privateCommunity.name.length >= 3 && privateCommunity.name.length <= 100,
  );
}
