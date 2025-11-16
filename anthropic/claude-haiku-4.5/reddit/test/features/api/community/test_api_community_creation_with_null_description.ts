import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test creation of a community with optional description field set to null.
 *
 * Validates that communities can be created without descriptions and that the
 * description field is properly stored and returned as null. Confirms that null
 * descriptions don't cause validation errors and are handled correctly in API
 * request/response payloads.
 *
 * Process:
 *
 * 1. Register a member account (community creator)
 * 2. Register an administrator account
 * 3. Create a community category
 * 4. Create a community with description explicitly set to null
 * 5. Verify null description is preserved in response
 * 6. Validate all other fields are correctly populated
 */
export async function test_api_community_creation_with_null_description(
  connection: api.IConnection,
) {
  // Step 1: Create member account for community creator
  const memberCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: "TestPassword123!",
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(memberResponse);

  // Step 2: Create administrator account for category management
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: "AdminPassword123!",
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin/register",
    referrer: "http://localhost:3000/admin",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminResponse: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminResponse);

  // Step 3: Create a category for the community
  const categoryCreateBody = {
    name: "Technology",
    slug: `tech-${RandomGenerator.alphaNumeric(6)}`,
    description: "Technology and software discussion",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // Switch back to member context for community creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberCreateBody.email,
      password: memberCreateBody.password,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 4: Create community with null description
  const communityCreateBody = {
    name: "Tech Discussion Community",
    identifier: `tech-${RandomGenerator.alphaNumeric(8)}`,
    description: null,
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(createdCommunity);

  // Step 5: Verify null description is properly preserved
  TestValidator.equals(
    "community description should be null",
    createdCommunity.description,
    null,
  );

  // Step 6: Validate other fields match the request
  TestValidator.equals(
    "community name should match",
    createdCommunity.name,
    communityCreateBody.name,
  );

  TestValidator.equals(
    "community identifier should match",
    createdCommunity.identifier,
    communityCreateBody.identifier,
  );

  TestValidator.equals(
    "community visibility should match",
    createdCommunity.visibility,
    communityCreateBody.visibility,
  );

  TestValidator.equals(
    "community post creation restriction should match",
    createdCommunity.post_creation_restriction,
    communityCreateBody.post_creation_restriction,
  );

  TestValidator.equals(
    "community post type restriction should match",
    createdCommunity.post_type_restriction,
    communityCreateBody.post_type_restriction,
  );

  TestValidator.equals(
    "community category slug should match",
    createdCommunity.category.slug,
    category.slug,
  );

  // Step 7: Verify other community fields are properly initialized
  TestValidator.predicate(
    "community should have valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdCommunity.id,
    ),
  );

  TestValidator.predicate(
    "subscriber count should be initialized",
    createdCommunity.subscriber_count >= 1,
  );

  TestValidator.equals(
    "post count should be zero",
    createdCommunity.post_count,
    0,
  );

  TestValidator.equals(
    "comment count should be zero",
    createdCommunity.comment_count,
    0,
  );

  TestValidator.predicate(
    "created_at should be valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdCommunity.created_at),
  );

  TestValidator.predicate(
    "updated_at should be valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdCommunity.updated_at),
  );

  TestValidator.predicate(
    "creator should match member",
    createdCommunity.creator.id === memberResponse.id,
  );
}
