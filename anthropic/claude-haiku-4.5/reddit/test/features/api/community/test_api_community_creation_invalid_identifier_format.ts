import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test validation of community identifier format constraints.
 *
 * Validates that the API correctly rejects community creation requests with
 * identifiers that violate the required format constraints. Community
 * identifiers must be lowercase alphanumeric with underscores only (3-32
 * characters).
 *
 * This test verifies:
 *
 * 1. Uppercase letters in identifier are rejected
 * 2. Spaces in identifier are rejected
 * 3. Special characters in identifier are rejected
 * 4. Identifiers not matching the required pattern are rejected
 * 5. Valid identifiers are accepted
 *
 * Test flow:
 *
 * 1. Create administrator account to manage categories
 * 2. Create a valid category for community classification
 * 3. Create member account to create communities
 * 4. Attempt to create communities with invalid identifier formats
 * 5. Verify each invalid attempt returns appropriate error
 * 6. Create community with valid identifier to confirm API works
 */
export async function test_api_community_creation_invalid_identifier_format(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "https://example.com/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a valid category
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

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: "MemberPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Test invalid identifier with uppercase letters
  await TestValidator.error(
    "should reject community identifier with uppercase letters",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "Tech Community",
            identifier: "TechCommunity",
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 5: Test invalid identifier with spaces
  await TestValidator.error(
    "should reject community identifier with spaces",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "Tech Community",
            identifier: "tech community",
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 6: Test invalid identifier with special characters
  await TestValidator.error(
    "should reject community identifier with special characters",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "Tech Community",
            identifier: "tech-community!",
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 7: Test invalid identifier with hyphens (not allowed, only underscores)
  await TestValidator.error(
    "should reject community identifier with hyphens",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "Tech Community",
            identifier: "tech-community",
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 8: Test invalid identifier too short (less than 3 characters)
  await TestValidator.error(
    "should reject community identifier shorter than 3 characters",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "Tech Community",
            identifier: "ab",
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 9: Test valid identifier format (lowercase alphanumeric with underscores)
  const validCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Community",
          identifier: "tech_community_101",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(validCommunity);

  // Verify the created community has the correct identifier
  TestValidator.equals(
    "valid community identifier matches input",
    validCommunity.identifier,
    "tech_community_101",
  );

  // Step 10: Test another valid identifier with only lowercase letters
  const simpleCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Gaming Community",
          identifier: "gaming",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(simpleCommunity);

  TestValidator.equals(
    "simple valid community identifier matches input",
    simpleCommunity.identifier,
    "gaming",
  );
}
