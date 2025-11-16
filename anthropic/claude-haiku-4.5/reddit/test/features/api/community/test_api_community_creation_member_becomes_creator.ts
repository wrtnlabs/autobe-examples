import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_member_becomes_creator(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const adminName = RandomGenerator.name();

  const administratorResult = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: adminName,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administratorResult);

  // Step 2: Create a category as administrator
  const categorySlug = `category_${RandomGenerator.alphaNumeric(8)}`;
  const categoryName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 5,
  });

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const memberUsername = `user_${RandomGenerator.alphaNumeric(8)}`;

  const memberResult = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberResult);

  // Step 4: Create community as member and verify creator assignment
  const communityIdentifier = `comm_${RandomGenerator.alphaNumeric(8)}`;
  const communityName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 6,
  });
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });

  const community =
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
  typia.assert(community);

  // Step 5: Verify creator information
  TestValidator.equals(
    "creator id matches member id",
    community.creator.id,
    memberResult.id,
  );
  TestValidator.equals(
    "creator username matches member username",
    community.creator.username,
    memberUsername,
  );
  TestValidator.equals(
    "creator email matches member email",
    community.creator.email,
    memberEmail,
  );

  // Step 6: Verify community properties
  TestValidator.equals(
    "community identifier matches request",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community name matches request",
    community.name,
    communityName,
  );
  TestValidator.equals(
    "community description matches request",
    community.description,
    communityDescription,
  );
  TestValidator.equals(
    "community visibility is public",
    community.visibility,
    "public",
  );
  TestValidator.equals(
    "community post creation restriction is open_to_all",
    community.post_creation_restriction,
    "open_to_all",
  );
  TestValidator.equals(
    "community post type restriction is all_types",
    community.post_type_restriction,
    "all_types",
  );

  // Step 7: Verify initial subscriber count (creator auto-subscribed)
  TestValidator.predicate(
    "community has at least one subscriber (creator)",
    community.subscriber_count >= 1,
  );

  // Step 8: Verify category assignment
  TestValidator.equals(
    "community category slug matches request",
    community.category.slug,
    categorySlug,
  );
}
