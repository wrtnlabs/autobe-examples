import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_establishes_creator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(8),
        name: "Test Administrator",
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create a test category for community creation
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: `test-category-${RandomGenerator.alphaNumeric(8)}`,
          description: "Test category for community creation",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create and authenticate a member account who will become the creator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(10);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: "MemberPassword123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  TestValidator.equals(
    "member created with correct email",
    member.id !== undefined,
    true,
  );

  // Step 4: Create a community with the authenticated member credentials
  const communityIdentifier = `test-community-${RandomGenerator.alphaNumeric(8)}`;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Test Community ${RandomGenerator.alphaNumeric(5)}`,
          identifier: communityIdentifier,
          description: "A test community to verify creator establishment",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Verify that the response's creator field matches the authenticated member
  TestValidator.equals(
    "creator id matches authenticated member",
    community.creator.id,
    member.id,
  );
  TestValidator.equals(
    "creator username matches authenticated member",
    community.creator.username,
    memberUsername,
  );
  TestValidator.equals(
    "creator email matches authenticated member",
    community.creator.email,
    memberEmail,
  );

  // Step 6: Verify creator cannot be overridden by client input
  TestValidator.predicate(
    "creator is automatically established from authentication context",
    community.creator.id === member.id &&
      community.creator.email === memberEmail,
  );

  // Step 7: Verify creator has proper permissions (subscriber count starts at 1 for creator)
  TestValidator.equals(
    "community creator is automatically subscribed",
    community.subscriber_count,
    1,
  );

  // Additional validation: Verify community metadata is correct
  TestValidator.equals(
    "community identifier matches request",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community visibility is public",
    community.visibility,
    "public",
  );
  TestValidator.equals(
    "community category matches created category",
    community.category.slug,
    category.slug,
  );
}
