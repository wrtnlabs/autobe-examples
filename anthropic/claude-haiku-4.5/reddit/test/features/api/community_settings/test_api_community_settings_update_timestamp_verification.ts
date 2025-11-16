import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySettings";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that updated_at timestamp is correctly set when settings are modified.
 *
 * Verify timestamp management in community settings:
 *
 * 1. Update community settings and note timestamps
 * 2. Perform sequential updates and verify updated_at advances
 * 3. Validate created_at remains immutable throughout all modifications
 * 4. Confirm timestamp progression reflects modification sequence
 *
 * This ensures proper audit trail tracking for settings changes and timestamp
 * integrity.
 */
export async function test_api_community_settings_update_timestamp_verification(
  connection: api.IConnection,
) {
  // Step 1: Create member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(10),
    password: "TestPassword123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberAuth);

  // Step 2: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: "AdminPassword123!",
    username: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(adminAuth);

  // Switch to admin for category creation
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 3: Create a category for the community
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    display_order: 1,
    description: RandomGenerator.paragraph(),
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 4: Switch back to member and create a community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const communityData = {
    name: RandomGenerator.name(2),
    identifier: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph(),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 5: Wait to ensure timestamp separation
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 6: First update - modify require_post_approval
  const firstUpdate =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          require_post_approval: true,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );

  typia.assert(firstUpdate);
  const initialCreatedAt = firstUpdate.created_at;
  const firstUpdatedAt = firstUpdate.updated_at;

  TestValidator.predicate("first update settings exist", firstUpdate !== null);
  TestValidator.predicate(
    "created_at is set on first update",
    initialCreatedAt !== null && initialCreatedAt !== undefined,
  );
  TestValidator.predicate(
    "updated_at is set on first update",
    firstUpdatedAt !== null && firstUpdatedAt !== undefined,
  );

  // Step 7: Wait and perform second update - modify minimum_karma_to_post
  await new Promise((resolve) => setTimeout(resolve, 100));

  const secondUpdate =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          minimum_karma_to_post: 50,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );

  typia.assert(secondUpdate);
  TestValidator.equals(
    "created_at should remain immutable after second update",
    secondUpdate.created_at,
    initialCreatedAt,
  );
  TestValidator.predicate(
    "updated_at should advance after second update",
    new Date(secondUpdate.updated_at).getTime() >=
      new Date(firstUpdatedAt).getTime(),
  );
  TestValidator.notEquals(
    "updated_at should be different from first update",
    secondUpdate.updated_at,
    firstUpdatedAt,
  );

  const secondUpdatedAt = secondUpdate.updated_at;

  // Step 8: Wait and perform third update - modify default_sort_method
  await new Promise((resolve) => setTimeout(resolve, 100));

  const thirdUpdate =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          default_sort_method: "top" as const,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );

  typia.assert(thirdUpdate);
  TestValidator.equals(
    "created_at should remain immutable after third update",
    thirdUpdate.created_at,
    initialCreatedAt,
  );
  TestValidator.predicate(
    "updated_at should advance after third update",
    new Date(thirdUpdate.updated_at).getTime() >=
      new Date(secondUpdatedAt).getTime(),
  );
  TestValidator.notEquals(
    "updated_at should be different from second update",
    thirdUpdate.updated_at,
    secondUpdatedAt,
  );

  const thirdUpdatedAt = thirdUpdate.updated_at;

  // Step 9: Verify timestamp progression
  TestValidator.predicate(
    "created_at is immutable throughout all updates",
    initialCreatedAt === firstUpdate.created_at &&
      firstUpdate.created_at === secondUpdate.created_at &&
      secondUpdate.created_at === thirdUpdate.created_at,
  );

  TestValidator.predicate(
    "updated_at progresses chronologically with each modification",
    new Date(firstUpdatedAt).getTime() <= new Date(secondUpdatedAt).getTime() &&
      new Date(secondUpdatedAt).getTime() <= new Date(thirdUpdatedAt).getTime(),
  );
}
