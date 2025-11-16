import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_auto_subscription(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account to set up a category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123!";
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create a category for the community
  const categorySlug = `category_${RandomGenerator.alphaNumeric(8)}`;
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: categorySlug,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "category creation successful",
    category.slug,
    categorySlug,
  );

  // Step 3: Create a member account to create the community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: memberPassword,
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  TestValidator.predicate(
    "member created successfully",
    member.id !== undefined,
  );

  // Step 4: Create a community as the member
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 6,
  });
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          identifier: communityIdentifier,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: categorySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Validate community creation and basic properties
  TestValidator.equals(
    "community identifier matches",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals("community name matches", community.name, communityName);
  TestValidator.equals(
    "category slug matches",
    community.category.slug,
    categorySlug,
  );

  // Step 6: Validate automatic creator subscription as first member
  TestValidator.equals(
    "subscriber count is 1 (creator auto-subscribed)",
    community.subscriber_count,
    1,
  );
  TestValidator.predicate(
    "creator information is present",
    community.creator !== null && community.creator !== undefined,
  );
  TestValidator.equals(
    "community creator is the authenticated member",
    community.creator.id,
    member.id,
  );

  // Step 7: Validate initial community state
  TestValidator.equals("initial post count is 0", community.post_count, 0);
  TestValidator.equals(
    "initial comment count is 0",
    community.comment_count,
    0,
  );
  TestValidator.equals("visibility is public", community.visibility, "public");
  TestValidator.equals(
    "post creation restriction is open_to_all",
    community.post_creation_restriction,
    "open_to_all",
  );
  TestValidator.equals(
    "post type restriction is all_types",
    community.post_type_restriction,
    "all_types",
  );
}
