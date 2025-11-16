import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_subscription_creator_auto_subscription(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: "TestPassword123!",
      href: "https://localhost:3000/register",
      referrer: "https://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  TestValidator.predicate(
    "member created successfully",
    member.id !== undefined,
  );

  // Step 2: Create an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "https://localhost:3000/admin/register",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);
  TestValidator.predicate(
    "administrator created successfully",
    administrator.id !== undefined,
  );

  // Step 3: Login as administrator to create category
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://localhost:3000/admin/login",
      referrer: "https://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 4: Create a category for the community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(8)}`,
          display_order: 1,
          description: "Technology discussions and news",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.predicate(
    "category created successfully",
    category.id !== undefined,
  );

  // Step 5: Login as member to create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "https://localhost:3000/login",
      referrer: "https://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 6: Create a community as the member
  const communityIdentifier = `tech_${RandomGenerator.alphaNumeric(8)}`;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussions",
          identifier: communityIdentifier,
          description: "A community for tech enthusiasts",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community created successfully",
    community.id !== undefined,
  );

  // Step 7: Verify the creator is auto-subscribed with subscriber_count = 1
  TestValidator.equals(
    "community subscriber count should be 1 after creation (creator auto-subscribed)",
    community.subscriber_count,
    1,
  );

  // Step 8: Verify the creator information
  TestValidator.equals(
    "community creator id should match authenticated member",
    community.creator.id,
    member.id,
  );

  // Step 9: Verify community basic properties
  TestValidator.equals(
    "community identifier should match requested identifier",
    community.identifier,
    communityIdentifier,
  );

  TestValidator.equals(
    "community name should match requested name",
    community.name,
    "Tech Discussions",
  );

  // Step 10: Verify subscription timestamp is set to community creation time
  TestValidator.predicate(
    "community created_at timestamp should be valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(community.created_at),
  );
}
