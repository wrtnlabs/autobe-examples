import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that unauthenticated guests can retrieve public community details.
 *
 * This test validates the accessibility of public communities by
 * unauthenticated users:
 *
 * 1. Creates an administrator account for category management
 * 2. Creates a test category for community classification
 * 3. Creates a member account to serve as community creator
 * 4. Creates a public community with the test category
 * 5. Removes authentication (simulates guest access)
 * 6. Retrieves the community as an unauthenticated user
 * 7. Verifies HTTP 200 response with complete community information
 * 8. Confirms public communities are accessible regardless of authentication
 *    status
 */
export async function test_api_community_retrieval_public_community_by_guest(
  connection: api.IConnection,
) {
  // 1. Create administrator account for category management
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Switch to admin authentication
  connection.headers ??= {};
  connection.headers.Authorization = admin.token.access;

  // 2. Create a test category
  const categoryData = {
    name: "Technology",
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    display_order: 1,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCategory.ICreate;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);

  // 3. Create member account to be community creator
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Switch to member authentication
  connection.headers.Authorization = member.token.access;

  // 4. Create a public community with the test category
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Verify community was created successfully
  TestValidator.equals(
    "community identifier matches",
    community.identifier,
    communityData.identifier,
  );
  TestValidator.equals(
    "community visibility is public",
    community.visibility,
    "public",
  );
  TestValidator.equals(
    "community post creation restriction matches",
    community.post_creation_restriction,
    "open_to_all",
  );

  // 5. Remove authentication to simulate guest access
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 6. Retrieve the community as an unauthenticated guest
  const retrievedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communities.at(guestConnection, {
      communityId: community.id,
    });
  typia.assert(retrievedCommunity);

  // 7. Verify complete community information is accessible
  TestValidator.equals(
    "community ID matches",
    retrievedCommunity.id,
    community.id,
  );
  TestValidator.equals(
    "community identifier matches retrieved",
    retrievedCommunity.identifier,
    community.identifier,
  );
  TestValidator.equals(
    "community name matches",
    retrievedCommunity.name,
    community.name,
  );
  TestValidator.equals(
    "community description matches",
    retrievedCommunity.description,
    community.description,
  );
  TestValidator.equals(
    "community visibility is public in response",
    retrievedCommunity.visibility,
    "public",
  );

  // Verify engagement metrics are present
  TestValidator.predicate(
    "subscriber count is non-negative",
    retrievedCommunity.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "post count is non-negative",
    retrievedCommunity.post_count >= 0,
  );
  TestValidator.predicate(
    "comment count is non-negative",
    retrievedCommunity.comment_count >= 0,
  );

  // Verify creator information is present
  TestValidator.predicate(
    "creator ID exists",
    retrievedCommunity.creator.id.length > 0,
  );
  TestValidator.predicate(
    "creator username exists",
    retrievedCommunity.creator.username.length > 0,
  );
  TestValidator.equals(
    "creator ID matches member",
    retrievedCommunity.creator.id,
    member.id,
  );

  // Verify category information is present
  TestValidator.equals(
    "category ID matches",
    retrievedCommunity.category.id,
    category.id,
  );
  TestValidator.equals(
    "category slug matches",
    retrievedCommunity.category.slug,
    category.slug,
  );

  // Verify timestamps
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedCommunity.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedCommunity.updated_at.length > 0,
  );

  // 8. Confirm public community is fully accessible without authentication
  TestValidator.predicate(
    "guest successfully retrieved public community",
    retrievedCommunity !== null,
  );
}
