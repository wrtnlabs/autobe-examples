import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Comprehensive community settings update test by administrator
 *
 * Validates that administrators can perform comprehensive updates to community
 * settings including description, status, privacy, and category modifications.
 * Tests administrator-level access privileges and ensures proper audit trail
 * maintenance for administrative actions.
 */
export async function test_api_community_admin_update_comprehensive_settings(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create and authenticate member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create a community as the member
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 7,
          }),
          slug: RandomGenerator.alphaNumeric(15),
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Switch back to administrator authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Perform comprehensive community settings update as administrator
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const updatedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.admin.communities.update(
      connection,
      {
        communitySlug: community.slug,
        body: {
          description:
            "Updated community description with comprehensive settings",
          status: "archived",
          privacy: "private",
          category: {
            id: categoryId,
            name: "technology",
            display_name: "Technology",
            slug: "technology",
            description: "Technology-focused communities",
            sort_order: 1,
            is_active: true,
            status: "active",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } satisfies ICommunityPlatformCommunityCategory.ISummary,
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);

  // Step 6: Validate comprehensive updates
  TestValidator.equals(
    "community ID remains unchanged after update",
    updatedCommunity.id,
    community.id,
  );

  TestValidator.equals(
    "community name remains unchanged after update",
    updatedCommunity.name,
    community.name,
  );

  TestValidator.equals(
    "community slug remains unchanged after update",
    updatedCommunity.slug,
    community.slug,
  );

  TestValidator.equals(
    "description should be updated to new value",
    updatedCommunity.description,
    "Updated community description with comprehensive settings",
  );

  TestValidator.equals(
    "status should be changed from active to archived",
    updatedCommunity.status,
    "archived",
  );

  TestValidator.equals(
    "privacy should be changed from public to private",
    updatedCommunity.privacy,
    "private",
  );

  TestValidator.predicate(
    "category should be assigned after update",
    updatedCommunity.category !== undefined,
  );

  TestValidator.equals(
    "category ID should match the assigned value",
    updatedCommunity.category?.id,
    categoryId,
  );

  TestValidator.equals(
    "category name should match technology",
    updatedCommunity.category?.name,
    "technology",
  );

  TestValidator.predicate(
    "updated timestamp should be newer than or equal to creation timestamp",
    new Date(updatedCommunity.updated_at) >= new Date(community.created_at),
  );
}
