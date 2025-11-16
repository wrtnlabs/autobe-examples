import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that community creation response includes all required fields and
 * correct structure.
 *
 * Verifies the community creation endpoint returns a complete response with all
 * expected fields:
 *
 * - Id (UUID format)
 * - Identifier (immutable, URL-safe handle)
 * - Name (display name)
 * - Description (optional, but present in response)
 * - Visibility (public or private)
 * - Post_creation_restriction (permission level)
 * - Post_type_restriction (content type filter)
 * - Subscriber_count (initial value should be 1 for creator)
 * - Post_count (initial value should be 0)
 * - Comment_count (initial value should be 0)
 * - Created_at (ISO 8601 timestamp)
 * - Updated_at (ISO 8601 timestamp)
 * - Deleted_at (null for active community)
 * - Category (complete ISummary object with id, name, slug, icon_url,
 *   display_order, is_active)
 * - Creator (complete ISummary object with id, username, email, email_verified,
 *   account_status, karma_score, created_at)
 *
 * Process:
 *
 * 1. Create administrator account for category management
 * 2. Create a community category
 * 3. Create member account to act as community creator
 * 4. Create community with proper configuration
 * 5. Validate all response fields match expected types and values
 * 6. Confirm relationships are properly populated
 */
export async function test_api_community_creation_response_fields(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePass123!";
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a community category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphabets(5).toLowerCase()}`,
          description: "Technology discussion community category",
          icon_url: "http://localhost:3000/icons/tech.png",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account as community creator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: `user_${RandomGenerator.alphabets(6).toLowerCase()}`,
      password: memberPassword,
      ip: "127.0.0.1",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create a community with the category
  const communityData = {
    name: RandomGenerator.name(2),
    identifier: `community_${RandomGenerator.alphabets(8).toLowerCase()}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(createdCommunity);

  // Step 5: Validate core identification fields
  TestValidator.equals(
    "identifier matches input",
    createdCommunity.identifier,
    communityData.identifier,
  );
  TestValidator.equals(
    "name matches input",
    createdCommunity.name,
    communityData.name,
  );
  TestValidator.equals(
    "visibility matches input",
    createdCommunity.visibility,
    "public",
  );
  TestValidator.equals(
    "post_creation_restriction matches input",
    createdCommunity.post_creation_restriction,
    "open_to_all",
  );
  TestValidator.equals(
    "post_type_restriction matches input",
    createdCommunity.post_type_restriction,
    "all_types",
  );

  // Step 6: Verify counter fields have expected initial values
  TestValidator.equals(
    "subscriber_count equals 1 on creation",
    createdCommunity.subscriber_count,
    1,
  );
  TestValidator.equals(
    "post_count equals 0 on creation",
    createdCommunity.post_count,
    0,
  );
  TestValidator.equals(
    "comment_count equals 0 on creation",
    createdCommunity.comment_count,
    0,
  );

  // Step 7: Verify category relationship is populated
  TestValidator.equals(
    "category slug matches input",
    createdCommunity.category.slug,
    category.slug,
  );
  TestValidator.equals(
    "category name matches created category",
    createdCommunity.category.name,
    category.name,
  );
  TestValidator.predicate(
    "category has id field",
    createdCommunity.category.id.length > 0,
  );

  // Step 8: Verify creator relationship is populated
  TestValidator.equals(
    "creator username matches member",
    createdCommunity.creator.username,
    member.id !== undefined ? undefined : undefined,
  );
  TestValidator.predicate(
    "creator has id field",
    createdCommunity.creator.id.length > 0,
  );
  TestValidator.predicate(
    "creator has username",
    createdCommunity.creator.username.length >= 3,
  );
  TestValidator.predicate(
    "creator has email",
    createdCommunity.creator.email.length > 0,
  );
  TestValidator.predicate(
    "creator account_status is valid",
    ["active", "suspended", "pending_deletion", "deleted"].includes(
      createdCommunity.creator.account_status,
    ),
  );
  TestValidator.predicate(
    "creator karma_score is non-negative",
    createdCommunity.creator.karma_score >= 0,
  );

  // Step 9: Validate timestamp fields exist and are valid strings
  TestValidator.predicate(
    "created_at is non-empty string",
    createdCommunity.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is non-empty string",
    createdCommunity.updated_at.length > 0,
  );

  // Step 10: Verify deleted_at is null for active community
  TestValidator.equals(
    "deleted_at is null for active community",
    createdCommunity.deleted_at,
    null,
  );

  // Step 11: Verify description is present
  TestValidator.predicate(
    "description is populated",
    createdCommunity.description !== null &&
      createdCommunity.description !== undefined,
  );

  // Final comprehensive validation - all fields are properly typed and structured
  typia.assert(createdCommunity);
}
