import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test community creation with minimal required fields.
 *
 * This test validates that a member can successfully create a community by
 * providing only the mandatory fields (name, identifier, visibility,
 * post_creation_restriction, post_type_restriction, category_slug) without
 * optional fields like description. The system should accept this minimal
 * configuration and create the community with sensible defaults.
 *
 * Test flow:
 *
 * 1. Register and authenticate an administrator account
 * 2. Create a category for the community
 * 3. Register and authenticate a member account
 * 4. Create a community with only required fields (no description)
 * 5. Verify the community is created successfully
 * 6. Validate the community has expected values and sensible defaults
 */
export async function test_api_community_creation_minimal_fields(
  connection: api.IConnection,
) {
  // 1. Create administrator account for category creation
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminUser = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: `admin_${RandomGenerator.alphaNumeric(6)}`,
      name: RandomGenerator.name(),
      href: "http://localhost:3000/admin",
      referrer: "",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminUser);

  // Authenticate as administrator
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000/admin",
      referrer: "",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // 2. Create a category for the community
  const categoryData = {
    name: "Technology",
    slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
    display_order: 1,
    description: "Technology and software development community",
    icon_url: "http://localhost:3000/icons/tech.png",
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);
  TestValidator.predicate(
    "category created with slug",
    category.slug === categoryData.slug,
  );

  // 3. Register and authenticate a member account
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberUser = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: `member_${RandomGenerator.alphaNumeric(6)}`,
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberUser);

  // Authenticate as member
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000/login",
      referrer: "",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 4. Create a community with only required fields (no description)
  const communityName = `Community_${RandomGenerator.alphaNumeric(6)}`;
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(6)}`;

  const communityData = {
    name: communityName,
    identifier: communityIdentifier,
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // 5. Verify the community is created successfully
  TestValidator.equals("community name matches", community.name, communityName);
  TestValidator.equals(
    "community identifier matches",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community visibility matches",
    community.visibility,
    "public",
  );
  TestValidator.equals(
    "community post_creation_restriction matches",
    community.post_creation_restriction,
    "open_to_all",
  );
  TestValidator.equals(
    "community post_type_restriction matches",
    community.post_type_restriction,
    "all_types",
  );

  // 6. Validate the community has expected values and sensible defaults
  TestValidator.predicate(
    "community has valid ID",
    community.id !== null && community.id !== undefined,
  );
  TestValidator.predicate(
    "community description is null or undefined",
    community.description === null || community.description === undefined,
  );
  TestValidator.predicate(
    "community subscriber count is 1",
    community.subscriber_count === 1,
  );
  TestValidator.predicate(
    "community post count is 0",
    community.post_count === 0,
  );
  TestValidator.predicate(
    "community comment count is 0",
    community.comment_count === 0,
  );
  TestValidator.predicate(
    "community has created_at timestamp",
    community.created_at !== null && community.created_at !== undefined,
  );
  TestValidator.predicate(
    "community has updated_at timestamp",
    community.updated_at !== null && community.updated_at !== undefined,
  );
  TestValidator.predicate(
    "community has no deleted_at timestamp",
    community.deleted_at === null || community.deleted_at === undefined,
  );

  // Verify category reference
  TestValidator.equals(
    "community category slug matches",
    community.category.slug,
    category.slug,
  );

  // Verify creator reference
  TestValidator.equals(
    "community creator ID matches member ID",
    community.creator.id,
    memberUser.id,
  );
}
