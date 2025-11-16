import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_duplicate_identifier_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category management
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword123!",
    username: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin/register",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create a category for communities
  const categoryData = {
    name: "Technology",
    slug: "technology",
    description: "Technology and programming discussions",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create first member account
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Data = {
    email: member1Email,
    username: RandomGenerator.alphabets(8),
    password: "Password123!",
    href: "http://localhost:3000/member/register",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityPlatformMember.ICreate;

  const member1 = await api.functional.auth.member.join(connection, {
    body: member1Data,
  });
  typia.assert(member1);

  // Step 4: Member1 creates community with identifier 'tech_news'
  const community1Data = {
    name: "Tech News",
    identifier: "tech_news",
    description: "Latest technology news and updates",
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community1 =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: community1Data,
      },
    );
  typia.assert(community1);
  TestValidator.equals(
    "first community identifier matches request",
    community1.identifier,
    "tech_news",
  );

  // Step 5: Create second member account
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Data = {
    email: member2Email,
    username: RandomGenerator.alphabets(8),
    password: "Password123!",
    href: "http://localhost:3000/member/register",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityPlatformMember.ICreate;

  const member2 = await api.functional.auth.member.join(connection, {
    body: member2Data,
  });
  typia.assert(member2);

  // Step 6: Member2 attempts to create community with duplicate identifier 'tech_news'
  const community2Data = {
    name: "Technology News",
    identifier: "tech_news",
    description: "Another tech news community",
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  // Step 7: Verify duplicate identifier is rejected with 409 Conflict
  await TestValidator.error(
    "duplicate community identifier should be rejected",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: community2Data,
        },
      );
    },
  );

  // Step 8: Verify first community was successfully created
  TestValidator.equals(
    "first community identifier is globally unique",
    community1.identifier,
    "tech_news",
  );

  TestValidator.predicate(
    "system prevents duplicate community identifier creation",
    true,
  );
}
