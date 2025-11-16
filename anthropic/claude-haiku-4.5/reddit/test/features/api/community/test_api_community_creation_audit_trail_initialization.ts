import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_audit_trail_initialization(
  connection: api.IConnection,
) {
  // Step 1: Create a member account and authenticate
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberData = {
    email: memberEmail,
    username: `testuser_${RandomGenerator.alphaNumeric(8)}`,
    password: "TestPassword123!",
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityPlatformMember.ICreate;

  const authenticatedMember = await api.functional.auth.member.join(
    connection,
    {
      body: memberData,
    },
  );
  typia.assert(authenticatedMember);

  // Step 2: Create a category for the community
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminData = {
    email: adminEmail,
    password: "AdminPassword123!",
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    name: "Test Administrator",
    href: "http://localhost:3000/admin",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const authenticatedAdmin = await api.functional.auth.administrator.join(
    connection,
    {
      body: adminData,
    },
  );
  typia.assert(authenticatedAdmin);

  // Switch to admin context
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const categoryData = {
    name: `Test Category ${RandomGenerator.alphaNumeric(4)}`,
    slug: `test-category-${RandomGenerator.alphaNumeric(8)}`,
    description: "Category for testing community audit trail initialization",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const createdCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(createdCategory);
  TestValidator.equals(
    "category name matches",
    createdCategory.name,
    categoryData.name,
  );

  // Step 3: Switch back to member context for community creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "http://localhost:3000/communities",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 4: Create a community
  const communityData = {
    name: `Test Community ${RandomGenerator.alphaNumeric(6)}`,
    identifier: `testcommunity${RandomGenerator.alphaNumeric(8)}`,
    description: "Community for testing audit trail initialization",
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: createdCategory.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(createdCommunity);

  // Step 5: Validate community creation and audit trail initialization
  TestValidator.equals(
    "community name matches creation data",
    createdCommunity.name,
    communityData.name,
  );

  TestValidator.equals(
    "community identifier matches creation data",
    createdCommunity.identifier,
    communityData.identifier,
  );

  TestValidator.equals(
    "community visibility matches creation data",
    createdCommunity.visibility,
    communityData.visibility,
  );

  TestValidator.equals(
    "creator ID is set to authenticated member",
    createdCommunity.creator.id,
    authenticatedMember.id,
  );

  TestValidator.equals(
    "initial subscriber count includes creator",
    createdCommunity.subscriber_count,
    1,
  );

  TestValidator.predicate(
    "created_at timestamp is set for audit trail",
    createdCommunity.created_at !== null &&
      createdCommunity.created_at !== undefined,
  );

  TestValidator.predicate(
    "updated_at timestamp is set for audit trail",
    createdCommunity.updated_at !== null &&
      createdCommunity.updated_at !== undefined,
  );

  TestValidator.predicate(
    "community is not deleted after creation",
    createdCommunity.deleted_at === null ||
      createdCommunity.deleted_at === undefined,
  );

  TestValidator.equals(
    "category relationship is properly established",
    createdCommunity.category.slug,
    createdCategory.slug,
  );

  TestValidator.equals(
    "creator information is properly recorded in audit trail",
    createdCommunity.creator.id,
    authenticatedMember.id,
  );

  TestValidator.predicate(
    "audit trail infrastructure records community creation with timestamp",
    typia.is<string & tags.Format<"date-time">>(createdCommunity.created_at),
  );
}
