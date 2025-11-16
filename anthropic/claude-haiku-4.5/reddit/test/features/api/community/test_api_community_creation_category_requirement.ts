import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_category_requirement(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: memberPassword,
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: "http://localhost:3000/admin/join",
      referrer: "http://localhost:3000/admin/",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Switch to admin context for creating categories
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000/admin/login",
      referrer: "http://localhost:3000/admin/",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 3: Create first category
  const category1Slug = "technology";
  const category1 =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: category1Slug,
          description: "Technology related communities",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category1);

  // Step 4: Create second category
  const category2Slug = "entertainment";
  const category2 =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Entertainment",
          slug: category2Slug,
          description: "Entertainment related communities",
          display_order: 2,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category2);

  // Switch back to member context
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 5: Attempt to create community without category_slug (should fail)
  await TestValidator.error(
    "community creation should fail without category_slug",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "Test Community",
            identifier: "test_community",
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: "",
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 6: Attempt to create community with non-existent category_slug (should fail)
  await TestValidator.error(
    "community creation should fail with non-existent category_slug",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "Invalid Category Community",
            identifier: "invalid_cat_community",
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: "nonexistent_category",
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 7: Create community with first valid category
  const community1 =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech News",
          identifier: "tech_news",
          description: "Latest technology news and discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category1Slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  TestValidator.equals(
    "community1 should be assigned to technology category",
    community1.category.slug,
    category1Slug,
  );

  // Step 8: Create community with second valid category
  const community2 =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Entertainment Hub",
          identifier: "entertainment_hub",
          description: "Entertainment discussions and news",
          visibility: "private",
          post_creation_restriction: "moderators_only",
          post_type_restriction: "text_and_images",
          category_slug: category2Slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  TestValidator.equals(
    "community2 should be assigned to entertainment category",
    community2.category.slug,
    category2Slug,
  );

  // Step 9: Verify each community is assigned to correct category
  TestValidator.notEquals(
    "communities should belong to different categories",
    community1.category.slug,
    community2.category.slug,
  );

  // Step 10: Attempt to create community with case-mismatch category_slug (should fail due to case sensitivity)
  await TestValidator.error(
    "community creation should fail with incorrect case category_slug",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "Case Test Community",
            identifier: "case_test_community",
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: "TECHNOLOGY",
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 11: Validate that category relationship is correctly maintained
  TestValidator.equals(
    "community1 category id should match created category",
    community1.category.id,
    category1.id,
  );

  TestValidator.equals(
    "community2 category id should match created category",
    community2.category.id,
    category2.id,
  );
}
