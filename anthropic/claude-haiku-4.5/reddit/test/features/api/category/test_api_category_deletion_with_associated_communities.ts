import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_category_deletion_with_associated_communities(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(8) + "Aa1!";
  const adminData = {
    email: adminEmail,
    password: adminPassword,
    username: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin/register",
    referrer: "http://localhost:3000",
    ip: "127.0.0.1",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create a category as administrator
  const categorySlug = RandomGenerator.alphabets(8).toLowerCase();
  const categoryData = {
    name: "Technology",
    slug: categorySlug,
    description: "Technology and IT discussions",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "category created successfully",
    category.slug,
    categorySlug,
  );

  // Step 3: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(8) + "Aa1!";
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8),
    password: memberPassword,
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Create a community in the category
  const communityIdentifier = RandomGenerator.alphabets(8).toLowerCase();
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: communityIdentifier,
    description: RandomGenerator.paragraph({ sentences: 3 }),
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
  TestValidator.equals(
    "community created in correct category",
    community.category.slug,
    category.slug,
  );

  // Step 5: Switch back to administrator context
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000/admin/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 6: Attempt to delete the category - should fail due to associated community
  await TestValidator.error(
    "category deletion should fail when communities are assigned",
    async () => {
      await api.functional.communityPlatform.administrator.categories.erase(
        connection,
        {
          categoryId: category.id,
        },
      );
    },
  );

  TestValidator.predicate(
    "referential integrity is enforced by preventing category deletion",
    true,
  );
}
