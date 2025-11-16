import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test the successful creation of a new community by an authenticated member
 * with all required fields and default settings. This validates the fundamental
 * community creation workflow and initialization of community infrastructure.
 *
 * Test workflow:
 *
 * 1. Create a member account through join endpoint for community creator
 * 2. Create an administrator account for category management
 * 3. Create a category for community classification
 * 4. Authenticate as the member
 * 5. Create a community with required fields:
 *
 *    - Name (3-100 characters)
 *    - Identifier (3-32 chars, lowercase alphanumeric with underscores)
 *    - Description (optional, up to 500 chars)
 *    - Visibility (public or private)
 *    - Post_creation_restriction (open_to_all, moderators_only, etc.)
 *    - Post_type_restriction (all_types, text_only, text_and_images, etc.)
 *    - Category_slug reference
 * 6. Verify HTTP 201 Created response
 * 7. Verify community initialization:
 *
 *    - UUID id generated
 *    - Creator field set to creating member
 *    - Subscriber_count = 1 (creator auto-subscribed)
 *    - Post_count = 0
 *    - Comment_count = 0
 *    - Created_at and updated_at timestamps in ISO 8601
 *    - Category correctly assigned
 *    - Visibility setting preserved
 * 8. Verify creator relationships and community infrastructure
 */
export async function test_api_community_creation_by_member_basic(
  connection: api.IConnection,
) {
  // Step 1: Create member account for community creator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = `member_${RandomGenerator.alphaNumeric(8)}`;
  const memberPassword = "SecurePass123!";

  const memberCreated = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
      href: "http://localhost:3000/auth/register",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberCreated);
  typia.assert(memberCreated.id);
  typia.assert(memberCreated.token);

  // Step 2: Create administrator account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = `admin_${RandomGenerator.alphaNumeric(8)}`;
  const adminPassword = "AdminPass123!";

  const adminCreated = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        username: adminUsername,
        password: adminPassword,
        name: "Platform Administrator",
        href: "http://localhost:3000/admin/register",
        referrer: "http://localhost:3000",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(adminCreated);

  // Step 3: Switch to admin context and create category
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000/admin/login",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const categorySlug = `category_${RandomGenerator.alphaNumeric(6)}`;
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: categorySlug,
          description: "Technology and programming discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.equals("category slug matches", category.slug, categorySlug);

  // Step 4: Switch back to member context
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000/auth/login",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 5: Create community with all required fields
  const communityName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(6)}`;
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 6,
  });

  const createdCommunity =
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
          category_slug: categorySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );

  // Step 6: Verify HTTP 201 and complete response
  typia.assert(createdCommunity);

  // Step 7: Verify community initialization and structure
  TestValidator.equals(
    "community name matches",
    createdCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "community identifier matches",
    createdCommunity.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community description matches",
    createdCommunity.description,
    communityDescription,
  );
  TestValidator.equals(
    "visibility is public",
    createdCommunity.visibility,
    "public",
  );
  TestValidator.equals(
    "post creation restriction is open_to_all",
    createdCommunity.post_creation_restriction,
    "open_to_all",
  );
  TestValidator.equals(
    "post type restriction is all_types",
    createdCommunity.post_type_restriction,
    "all_types",
  );

  // Verify default counts
  TestValidator.equals(
    "subscriber count initialized to 1",
    createdCommunity.subscriber_count,
    1,
  );
  TestValidator.equals(
    "post count initialized to 0",
    createdCommunity.post_count,
    0,
  );
  TestValidator.equals(
    "comment count initialized to 0",
    createdCommunity.comment_count,
    0,
  );

  // Verify UUID format for community id
  TestValidator.predicate(
    "community id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdCommunity.id,
    ),
  );

  // Verify creator information
  TestValidator.equals(
    "creator username matches member",
    createdCommunity.creator.username,
    memberUsername,
  );
  TestValidator.equals(
    "creator id matches",
    createdCommunity.creator.id,
    memberCreated.id,
  );

  // Verify category assignment
  TestValidator.equals(
    "category slug matches",
    createdCommunity.category.slug,
    categorySlug,
  );
  TestValidator.equals(
    "category name is Technology",
    createdCommunity.category.name,
    "Technology",
  );

  // Verify timestamps are ISO 8601 format
  TestValidator.predicate(
    "created_at is valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(
      createdCommunity.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(
      createdCommunity.updated_at,
    ),
  );

  // Verify deleted_at is null (community is active)
  TestValidator.equals(
    "deleted_at is null for active community",
    createdCommunity.deleted_at,
    null,
  );

  // Test edge case: Community with minimum name length (3 chars)
  const minCommunityName = "abc";
  const minCommunityIdentifier = `min_${RandomGenerator.alphaNumeric(4)}`;

  const minCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: minCommunityName,
          identifier: minCommunityIdentifier,
          description: null,
          visibility: "private",
          post_creation_restriction: "moderators_only",
          post_type_restriction: "text_only",
          category_slug: categorySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(minCommunity);
  TestValidator.equals(
    "minimum name length accepted",
    minCommunity.name,
    minCommunityName,
  );
  TestValidator.equals(
    "private visibility respected",
    minCommunity.visibility,
    "private",
  );
  TestValidator.equals(
    "moderators_only restriction applied",
    minCommunity.post_creation_restriction,
    "moderators_only",
  );
  TestValidator.equals(
    "text_only post type applied",
    minCommunity.post_type_restriction,
    "text_only",
  );

  // Test edge case: Community with maximum name length (100 chars)
  const maxCommunityName = RandomGenerator.paragraph({
    sentences: 15,
    wordMin: 4,
    wordMax: 8,
  }).substring(0, 100);
  const maxCommunityIdentifier = `max_${RandomGenerator.alphaNumeric(4)}`;

  const maxCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: maxCommunityName,
          identifier: maxCommunityIdentifier,
          description: RandomGenerator.paragraph({
            sentences: 8,
            wordMin: 3,
            wordMax: 6,
          }),
          visibility: "public",
          post_creation_restriction: "approved_members_only",
          post_type_restriction: "text_and_images",
          category_slug: categorySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(maxCommunity);
  TestValidator.equals(
    "maximum name length accepted",
    maxCommunity.name.length <= 100,
    true,
  );
  TestValidator.equals(
    "approved_members_only restriction applied",
    maxCommunity.post_creation_restriction,
    "approved_members_only",
  );
  TestValidator.equals(
    "text_and_images post type applied",
    maxCommunity.post_type_restriction,
    "text_and_images",
  );

  // Test community with identifier containing underscores
  const underscoreCommunityIdentifier = `test_community_name_${RandomGenerator.alphaNumeric(4)}`;
  const underscoreCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 6,
          }),
          identifier: underscoreCommunityIdentifier,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: categorySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(underscoreCommunity);
  TestValidator.predicate(
    "identifier with underscores is valid",
    /^[a-z0-9_]+$/.test(underscoreCommunity.identifier),
  );
}
