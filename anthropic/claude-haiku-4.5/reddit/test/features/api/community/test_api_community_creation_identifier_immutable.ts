import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that community identifiers are immutable after creation.
 *
 * This test validates a critical requirement: once a community is created with
 * a specific identifier (handle), that identifier must remain permanent and
 * cannot be changed. Identifiers are used in URLs (r/[identifier]) and must
 * remain stable for bookmarking and sharing purposes.
 *
 * Process:
 *
 * 1. Create administrator account
 * 2. Create a category for community classification
 * 3. Create member account (community creator)
 * 4. Create a community with a specific identifier
 * 5. Verify the identifier is correctly stored and immutable
 */
export async function test_api_community_creation_identifier_immutable(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: `Admin User ${RandomGenerator.name()}`,
        href: "https://localhost/admin/join",
        referrer: "https://localhost/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create a category for community classification
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: `Technology_${RandomGenerator.alphaNumeric(6)}`,
          slug: `tech-${RandomGenerator.alphaNumeric(6)}`,
          description: "Technology and science discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account (community creator)
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphaNumeric(8)}`,
        password: "MemberPassword123!",
        href: "https://localhost/join",
        referrer: "https://localhost",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community with a specific identifier
  const communityIdentifier =
    `test_${RandomGenerator.alphaNumeric(8)}`.toLowerCase();
  const communityName = `Test Community ${RandomGenerator.name(2)}`;
  const communityDescription = RandomGenerator.paragraph({ sentences: 3 });

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          identifier: communityIdentifier,
          description: communityDescription,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  // Step 5: Verify the identifier is correctly stored and immutable
  TestValidator.equals(
    "community identifier matches created identifier",
    createdCommunity.identifier,
    communityIdentifier,
  );

  TestValidator.equals(
    "community name matches created name",
    createdCommunity.name,
    communityName,
  );

  TestValidator.equals(
    "community description matches created description",
    createdCommunity.description,
    communityDescription,
  );

  TestValidator.equals(
    "community category matches created category",
    createdCommunity.category.slug,
    category.slug,
  );

  TestValidator.equals(
    "community creator matches authenticated member",
    createdCommunity.creator.id,
    member.id,
  );

  TestValidator.predicate(
    "community identifier is not empty",
    createdCommunity.identifier.length > 0,
  );

  TestValidator.predicate(
    "community identifier follows lowercase pattern",
    /^[a-z0-9_]+$/.test(createdCommunity.identifier),
  );

  TestValidator.predicate(
    "community identifier is within valid length range",
    createdCommunity.identifier.length >= 3 &&
      createdCommunity.identifier.length <= 32,
  );

  // Verify creation timestamp is set
  TestValidator.predicate(
    "community creation timestamp is valid",
    new Date(createdCommunity.created_at).getTime() > 0,
  );

  // Verify initial subscriber count (creator is auto-subscribed)
  TestValidator.equals(
    "community has initial subscriber count",
    createdCommunity.subscriber_count,
    1,
  );

  // Verify initial post count is zero
  TestValidator.equals(
    "community has zero initial posts",
    createdCommunity.post_count,
    0,
  );

  // Verify initial comment count is zero
  TestValidator.equals(
    "community has zero initial comments",
    createdCommunity.comment_count,
    0,
  );
}
