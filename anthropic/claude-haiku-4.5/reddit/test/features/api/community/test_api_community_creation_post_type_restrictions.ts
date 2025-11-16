import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_post_type_restrictions(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePassword123!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: memberPassword,
      ip: "127.0.0.1",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: "http://localhost:3000/admin/register",
      referrer: "http://localhost:3000/admin",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: RandomGenerator.alphabets(8),
          display_order: 1,
          description: "Tech and programming discussions",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch to member account
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 4: Test 'all_types' restriction
  const communityAllTypes =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "All Types Community",
          identifier: RandomGenerator.alphabets(12),
          description: "Community allowing all post types",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityAllTypes);
  TestValidator.equals(
    "all_types restriction should be set correctly",
    communityAllTypes.post_type_restriction,
    "all_types",
  );

  // Step 5: Test 'text_only' restriction
  const communityTextOnly =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Text Only Community",
          identifier: RandomGenerator.alphabets(12),
          description: "Community allowing only text posts",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_only",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityTextOnly);
  TestValidator.equals(
    "text_only restriction should be set correctly",
    communityTextOnly.post_type_restriction,
    "text_only",
  );

  // Step 6: Test 'text_and_images' restriction
  const communityTextAndImages =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Text and Images Community",
          identifier: RandomGenerator.alphabets(12),
          description: "Community allowing text and image posts",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_and_images",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityTextAndImages);
  TestValidator.equals(
    "text_and_images restriction should be set correctly",
    communityTextAndImages.post_type_restriction,
    "text_and_images",
  );

  // Step 7: Test 'text_and_links' restriction
  const communityTextAndLinks =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Text and Links Community",
          identifier: RandomGenerator.alphabets(12),
          description: "Community allowing text and link posts",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_and_links",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityTextAndLinks);
  TestValidator.equals(
    "text_and_links restriction should be set correctly",
    communityTextAndLinks.post_type_restriction,
    "text_and_links",
  );

  // Step 8: Test 'images_only' restriction
  const communityImagesOnly =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Images Only Community",
          identifier: RandomGenerator.alphabets(12),
          description: "Community allowing only image posts",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "images_only",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityImagesOnly);
  TestValidator.equals(
    "images_only restriction should be set correctly",
    communityImagesOnly.post_type_restriction,
    "images_only",
  );

  // Step 9: Verify all communities were created with correct properties
  TestValidator.predicate(
    "all_types community should have creator information",
    communityAllTypes.creator !== null &&
      communityAllTypes.creator.id === member.id,
  );

  TestValidator.predicate(
    "text_only community should have correct category",
    communityTextOnly.category.slug === category.slug,
  );

  TestValidator.predicate(
    "communities should be public",
    communityTextAndImages.visibility === "public" &&
      communityTextAndLinks.visibility === "public" &&
      communityImagesOnly.visibility === "public",
  );

  TestValidator.predicate(
    "communities should allow open post creation",
    communityAllTypes.post_creation_restriction === "open_to_all" &&
      communityTextOnly.post_creation_restriction === "open_to_all" &&
      communityTextAndImages.post_creation_restriction === "open_to_all",
  );

  // Step 10: Verify all restriction types were properly set
  const restrictions = [
    "all_types",
    "text_only",
    "text_and_images",
    "text_and_links",
    "images_only",
  ];
  const createdCommunities = [
    communityAllTypes,
    communityTextOnly,
    communityTextAndImages,
    communityTextAndLinks,
    communityImagesOnly,
  ];

  for (let i = 0; i < createdCommunities.length; i++) {
    TestValidator.equals(
      `community ${i + 1} should have correct restriction`,
      createdCommunities[i].post_type_restriction,
      restrictions[i] as any,
    );
  }

  // Step 11: Verify communities have initial subscriber count
  TestValidator.predicate(
    "communities should have at least 1 subscriber (creator)",
    createdCommunities.every((c) => c.subscriber_count >= 1),
  );

  // Step 12: Verify communities have zero posts initially
  TestValidator.predicate(
    "communities should start with zero posts",
    createdCommunities.every((c) => c.post_count === 0),
  );

  // Step 13: Verify communities have zero comments initially
  TestValidator.predicate(
    "communities should start with zero comments",
    createdCommunities.every((c) => c.comment_count === 0),
  );
}
