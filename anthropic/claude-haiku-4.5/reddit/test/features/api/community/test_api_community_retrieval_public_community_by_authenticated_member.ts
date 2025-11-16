import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_retrieval_public_community_by_authenticated_member(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const authenticatedMember = await api.functional.auth.member.join(
    connection,
    {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    },
  );
  typia.assert(authenticatedMember);

  // 2. Create an administrator account and authenticate to create category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const authenticatedAdmin = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        username: RandomGenerator.alphabets(10),
        password: adminPassword,
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(authenticatedAdmin);

  // 3. Login as administrator to set up category
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // 4. Create a category for the community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphabets(8),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Login back as member to create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 6. Create a public community
  const communityName = RandomGenerator.paragraph({ sentences: 2 });
  const communityIdentifier = RandomGenerator.alphabets(8);
  const createdCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          identifier: communityIdentifier,
          description: RandomGenerator.content({ paragraphs: 1 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  // 7. Retrieve the community by ID as authenticated member
  const retrievedCommunity =
    await api.functional.communityPlatform.communities.at(connection, {
      communityId: createdCommunity.id,
    });
  typia.assert(retrievedCommunity);

  // 8. Validate all community metadata is correctly returned
  TestValidator.equals(
    "community name matches",
    retrievedCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "community identifier matches",
    retrievedCommunity.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community visibility is public",
    retrievedCommunity.visibility,
    "public",
  );
  TestValidator.equals(
    "post creation restriction matches",
    retrievedCommunity.post_creation_restriction,
    "open_to_all",
  );
  TestValidator.equals(
    "post type restriction matches",
    retrievedCommunity.post_type_restriction,
    "all_types",
  );

  // 9. Validate creator information
  TestValidator.equals(
    "creator ID matches authenticated member",
    retrievedCommunity.creator.id,
    authenticatedMember.id,
  );
  TestValidator.predicate(
    "creator has non-negative karma",
    retrievedCommunity.creator.karma_score >= 0,
  );

  // 10. Validate category information
  TestValidator.equals(
    "category slug matches",
    retrievedCommunity.category.slug,
    category.slug,
  );

  // 11. Validate subscriber count (creator should be auto-subscribed)
  TestValidator.predicate(
    "subscriber count should be at least 1",
    retrievedCommunity.subscriber_count >= 1,
  );

  // 12. Validate timestamps exist
  TestValidator.predicate(
    "created_at should be set",
    retrievedCommunity.created_at !== null &&
      retrievedCommunity.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at should be set",
    retrievedCommunity.updated_at !== null &&
      retrievedCommunity.updated_at !== undefined,
  );
}
