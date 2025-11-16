import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test community creation with post_creation_restriction='open_to_all'.
 *
 * Validates that when a community is created with post_creation_restriction set
 * to 'open_to_all', the setting is correctly stored and allows any
 * authenticated community member to create posts without moderator approval or
 * permission gating. This test ensures the community creation workflow properly
 * handles the post creation restriction configuration.
 *
 * Test workflow:
 *
 * 1. Administrator creates a category for community classification
 * 2. Member authenticates with the platform
 * 3. Member creates a community with post_creation_restriction='open_to_all'
 * 4. Verify that the community's post_creation_restriction setting is correctly
 *    stored
 * 5. Confirm that the community is properly initialized with all expected
 *    attributes
 * 6. Validate that the creator is automatically subscribed (subscriber_count=1)
 */
export async function test_api_community_creation_open_post_restriction(
  connection: api.IConnection,
) {
  // Step 1: Administrator creates a category
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(8),
    username: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateData,
    });
  typia.assert(admin);

  // Switch to admin session
  connection.headers ??= {};
  connection.headers.Authorization = admin.token.access;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.predicate(
    "category created successfully",
    category.id !== undefined,
  );

  // Step 2: Member authenticates with the platform
  const memberCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphabets(12),
    ip: undefined,
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateData,
    });
  typia.assert(member);

  // Switch to member session
  connection.headers.Authorization = member.token.access;

  // Step 3: Member creates a community with post_creation_restriction='open_to_all'
  const communityData = {
    name: RandomGenerator.name(3),
    identifier: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(createdCommunity);

  // Step 4: Verify that post_creation_restriction is correctly stored
  TestValidator.equals(
    "post_creation_restriction should be 'open_to_all'",
    createdCommunity.post_creation_restriction,
    "open_to_all",
  );

  // Step 5: Confirm community attributes
  TestValidator.equals(
    "community name matches created data",
    createdCommunity.name,
    communityData.name,
  );

  TestValidator.equals(
    "community identifier matches created data",
    createdCommunity.identifier,
    communityData.identifier,
  );

  TestValidator.equals(
    "community visibility should be public",
    createdCommunity.visibility,
    "public",
  );

  TestValidator.equals(
    "post_type_restriction should be all_types",
    createdCommunity.post_type_restriction,
    "all_types",
  );

  TestValidator.equals(
    "category slug matches",
    createdCommunity.category.slug,
    category.slug,
  );

  // Step 6: Validate creator subscription
  TestValidator.equals(
    "creator should be automatically subscribed (subscriber_count=1)",
    createdCommunity.subscriber_count,
    1,
  );

  TestValidator.equals(
    "creator id should match member id",
    createdCommunity.creator.id,
    member.id,
  );

  TestValidator.predicate(
    "community created_at timestamp should be set",
    createdCommunity.created_at !== undefined &&
      createdCommunity.created_at.length > 0,
  );

  TestValidator.predicate(
    "post_count should start at 0",
    createdCommunity.post_count === 0,
  );

  TestValidator.predicate(
    "comment_count should start at 0",
    createdCommunity.comment_count === 0,
  );
}
