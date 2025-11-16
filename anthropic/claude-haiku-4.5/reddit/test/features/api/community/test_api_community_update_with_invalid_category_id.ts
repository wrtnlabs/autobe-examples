import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that updating community with non-existent category_id results in
 * validation error.
 *
 * This test validates that the system properly rejects community updates when
 * an invalid category_id is provided. It ensures data integrity by preventing
 * communities from being assigned to non-existent categories.
 *
 * Steps:
 *
 * 1. Create administrator account for community management operations
 * 2. Create a valid category to use in initial community creation
 * 3. Create member account who will be the community creator
 * 4. Create a community assigned to the valid category
 * 5. Attempt to update community with a non-existent category_id
 * 6. Verify the update fails with appropriate error
 * 7. Confirm community category remains unchanged
 */
export async function test_api_community_update_with_invalid_category_id(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphabets(12);
  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
    username: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Create a valid category
  const validCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(validCategory);

  // 3. Create member account (community creator)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphabets(12);
  const memberCreateBody = {
    email: memberEmail,
    username: RandomGenerator.alphabets(10),
    password: memberPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // Switch to member context for community creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 4. Create a community with the valid category
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: validCategory.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community created with valid category",
    community.category.id,
    validCategory.id,
  );

  // Switch to administrator context for update operation
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // 5. Generate an invalid (non-existent) category_id
  const invalidCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 6. Attempt to update community with invalid category_id and verify error
  await TestValidator.error(
    "updating community with invalid category_id should fail",
    async () => {
      await api.functional.communityPlatform.administrator.communities.update(
        connection,
        {
          communityId: community.id,
          body: {
            category_id: invalidCategoryId,
          } satisfies ICommunityPlatformCommunity.IUpdate,
        },
      );
    },
  );

  // 7. Verify community remains assigned to original valid category
  TestValidator.equals(
    "community category should remain unchanged after failed update",
    community.category.id,
    validCategory.id,
  );
}
