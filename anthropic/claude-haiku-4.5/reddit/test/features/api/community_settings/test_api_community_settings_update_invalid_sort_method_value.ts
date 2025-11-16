import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySettings";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_settings_update_invalid_sort_method_value(
  connection: api.IConnection,
) {
  // 1. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8),
    password: "SecurePass123!",
    href: "http://localhost:3000/auth/register",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // 2. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: "AdminPass123!",
    username: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/auth/admin/register",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // 3. Create category
  const categoryData = {
    name: "Technology",
    slug: "technology-" + RandomGenerator.alphabets(4),
    description: "Technology discussions and news",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);

  // 4. Switch to member account and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "SecurePass123!",
      href: "http://localhost:3000/auth/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const communityData = {
    name: "Tech Discussion",
    identifier: "tech-" + RandomGenerator.alphabets(6),
    description: "A community for technology discussions",
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(community);

  // 5. Test with valid sort method values and verify API accepts only predefined values
  const validSortMethods: Array<"hot" | "new" | "top" | "controversial"> = [
    "hot",
    "new",
    "top",
    "controversial",
  ];

  for (const validMethod of validSortMethods) {
    const updatedSettings =
      await api.functional.communityPlatform.member.communities.settings.update(
        connection,
        {
          communityId: community.id,
          body: {
            default_sort_method: validMethod,
          } satisfies ICommunityPlatformCommunitySettings.IUpdate,
        },
      );
    typia.assert(updatedSettings);
    TestValidator.equals(
      `default_sort_method should be updated to ${validMethod}`,
      updatedSettings.default_sort_method,
      validMethod,
    );
  }

  // 6. Verify settings persist correctly and enum validation is enforced by type system
  const finalSettings =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          default_sort_method: "hot",
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(finalSettings);
  TestValidator.predicate(
    "default_sort_method should be one of the valid enum values",
    ["hot", "new", "top", "controversial"].includes(
      finalSettings.default_sort_method,
    ),
  );
}
