import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that community identifiers must be globally unique and properly validate
 * identifier format constraints.
 *
 * This test ensures identifier immutability and prevents namespace collisions
 * by:
 *
 * 1. Creating member and administrator accounts for testing
 * 2. Setting up a test category
 * 3. Creating a community with identifier 'tech_news' and verifying success
 * 4. Attempting to create duplicate community with same identifier and expecting
 *    HTTP 409
 * 5. Testing invalid identifier formats (uppercase, spaces, special chars,
 *    hyphens, length violations)
 * 6. Testing valid identifier formats with numbers and underscores
 * 7. Verifying global uniqueness across platform
 * 8. Verifying identifier case sensitivity
 */
export async function test_api_community_creation_identifier_uniqueness(
  connection: api.IConnection,
) {
  // Create first member account
  const memberEmail1 = typia.random<string & tags.Format<"email">>();
  const member1Password = RandomGenerator.alphabets(12);
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail1,
        username: RandomGenerator.alphaNumeric(8),
        password: member1Password,
        ip: "127.0.0.1",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // Create second member account for duplicate test
  const memberEmail2 = typia.random<string & tags.Format<"email">>();
  const member2Password = RandomGenerator.alphabets(12);
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail2,
        username: RandomGenerator.alphaNumeric(8),
        password: member2Password,
        ip: "127.0.0.1",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create category as administrator
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch back to first member to create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail1,
      password: member1Password,
      ip: "127.0.0.1",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Test 1: Create community with identifier 'tech_news' - should succeed
  const community1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech News Community",
          identifier: "tech_news",
          description: "A community for discussing technology news",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  TestValidator.equals(
    "identifier matches",
    community1.identifier,
    "tech_news",
  );

  // Test 2: Attempt to create duplicate community with same identifier - should fail with 409
  await TestValidator.error(
    "duplicate identifier should return 409 conflict",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "Another Tech News",
            identifier: "tech_news",
            description: "Duplicate identifier",
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Test 3: Attempt with different member - duplicate should still fail
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail2,
      password: member2Password,
      ip: "127.0.0.1",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  await TestValidator.error(
    "duplicate identifier from different member should also fail",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "Tech News v2",
            identifier: "tech_news",
            description: "Trying to create duplicate from different user",
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Test 4: Invalid format - uppercase letters should fail
  await TestValidator.error("uppercase identifier should fail", async () => {
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Community",
          identifier: "Tech_News",
          description: "Invalid uppercase",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  });

  // Test 5: Invalid format - hyphens should fail
  await TestValidator.error("hyphens in identifier should fail", async () => {
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Community",
          identifier: "tech-news",
          description: "Invalid hyphen",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  });

  // Test 6: Invalid format - too short (1-2 chars)
  await TestValidator.error("identifier too short should fail", async () => {
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech",
          identifier: "tc",
          description: "Too short identifier",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  });

  // Test 7: Invalid format - too long (33+ chars)
  await TestValidator.error("identifier too long should fail", async () => {
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Community",
          identifier: "this_is_a_very_long_identifier_that_exceeds_limit",
          description: "Too long identifier",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  });

  // Test 8: Valid format - lowercase with numbers and underscores
  const community2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Gaming Community",
          identifier: "gaming_2024",
          description: "Valid identifier with numbers",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  TestValidator.equals(
    "valid identifier with numbers",
    community2.identifier,
    "gaming_2024",
  );

  // Test 9: Valid format - minimum length (3 chars)
  const community3: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Dev Community",
          identifier: "dev",
          description: "Minimum length identifier",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community3);
  TestValidator.equals(
    "minimum length identifier",
    community3.identifier,
    "dev",
  );

  // Test 10: Valid format - maximum length (32 chars)
  const community4: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Long Community",
          identifier: "this_is_a_thirty_two_char_id12",
          description: "Maximum length identifier",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community4);
  TestValidator.equals(
    "maximum length identifier",
    community4.identifier,
    "this_is_a_thirty_two_char_id12",
  );

  // Test 11: Case sensitivity - different case should be treated as same (global uniqueness)
  await TestValidator.error(
    "case insensitive matching should prevent tech_news uppercase variant",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "Tech News Alt",
            identifier: "tech_news",
            description: "Case variation of existing identifier",
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );
}
