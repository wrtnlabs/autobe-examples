import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_identifier_validation(
  connection: api.IConnection,
) {
  // Setup: Create administrator and category for testing
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create a category for community creation
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

  // Setup: Create member for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Test 1: Valid community identifier should succeed
  const validIdentifier = "tech_community_123";
  const validCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Valid Tech Community",
          identifier: validIdentifier,
          description: "A community with valid identifier",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(validCommunity);
  TestValidator.equals(
    "valid community identifier",
    validCommunity.identifier,
    validIdentifier,
  );

  // Test 2: Identifier with uppercase letters should fail
  await TestValidator.error(
    "uppercase letters in identifier should fail",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "Invalid Uppercase Community",
            identifier: "TechCommunity",
            description: "Identifier with uppercase letters",
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Test 3: Identifier with hyphens should fail
  await TestValidator.error("hyphens in identifier should fail", async () => {
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Invalid Hyphen Community",
          identifier: "tech-community",
          description: "Identifier with hyphens",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  });

  // Test 4: Identifier with spaces should fail
  await TestValidator.error("spaces in identifier should fail", async () => {
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Invalid Space Community",
          identifier: "tech community",
          description: "Identifier with spaces",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  });

  // Test 5: Identifier with special characters should fail
  await TestValidator.error(
    "special characters in identifier should fail",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "Invalid Special Community",
            identifier: "tech@community!",
            description: "Identifier with special characters",
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Test 6: Identifier that is too short should fail
  await TestValidator.error(
    "identifier shorter than 3 characters should fail",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "Invalid Short Community",
            identifier: "ab",
            description: "Identifier too short",
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Test 7: Another valid identifier with only lowercase and underscores
  const anotherValidIdentifier = "another_valid_community_2024";
  const anotherValidCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Another Valid Community",
          identifier: anotherValidIdentifier,
          description: "Another community with valid identifier format",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(anotherValidCommunity);
  TestValidator.equals(
    "another valid community identifier",
    anotherValidCommunity.identifier,
    anotherValidIdentifier,
  );
}
