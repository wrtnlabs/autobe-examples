import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Tests category update functionality for administrators.
 *
 * This test validates that administrators can successfully update category
 * metadata including name, slug, description, icon URL, display order, and
 * active status. The test creates an initial category through administrator
 * setup, then performs comprehensive updates to verify that all modifiable
 * properties are correctly persisted. The test ensures slug uniqueness is
 * maintained, timestamps are properly refreshed, and unchanged properties
 * retain their original values.
 *
 * Test workflow:
 *
 * 1. Create administrator account for authorization
 * 2. Create initial category with baseline properties
 * 3. Update category with modified name, slug, description, icon URL, display
 *    order, and is_active status
 * 4. Verify all updated properties match the provided values
 * 5. Confirm slug uniqueness is maintained
 * 6. Validate updated_at timestamp is refreshed
 * 7. Confirm unchanged properties (id, created_at) retain original values
 */
export async function test_api_category_update_by_administrator(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: RandomGenerator.paragraph({ sentences: 1 }),
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 2. Create initial category with baseline properties
  const initialCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(initialCategory);

  // 3. Prepare update data with all modifiable properties
  const updatedName = RandomGenerator.paragraph({ sentences: 1 });
  const updatedSlug = RandomGenerator.alphabets(10).toLowerCase();
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedIconUrl = typia.random<string & tags.Format<"uri">>();
  const updatedDisplayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const updatedIsActive = !initialCategory.is_active;

  // 4. Update category with all modifiable properties
  const updatedCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.update(
      connection,
      {
        categoryId: initialCategory.id,
        body: {
          name: updatedName,
          slug: updatedSlug,
          description: updatedDescription,
          icon_url: updatedIconUrl,
          display_order: updatedDisplayOrder,
          is_active: updatedIsActive,
        } satisfies ICommunityPlatformCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);

  // 5. Validate all updated properties match provided values
  TestValidator.equals(
    "updated name matches",
    updatedCategory.name,
    updatedName,
  );
  TestValidator.equals(
    "updated slug matches",
    updatedCategory.slug,
    updatedSlug,
  );
  TestValidator.equals(
    "updated description matches",
    updatedCategory.description,
    updatedDescription,
  );
  TestValidator.equals(
    "updated icon_url matches",
    updatedCategory.icon_url,
    updatedIconUrl,
  );
  TestValidator.equals(
    "updated display_order matches",
    updatedCategory.display_order,
    updatedDisplayOrder,
  );
  TestValidator.equals(
    "updated is_active matches",
    updatedCategory.is_active,
    updatedIsActive,
  );

  // 6. Confirm slug uniqueness is maintained
  TestValidator.predicate(
    "slug is unique",
    updatedCategory.slug !== initialCategory.slug,
  );

  // 7. Validate updated_at timestamp is refreshed
  TestValidator.predicate(
    "updated_at is refreshed",
    updatedCategory.updated_at !== initialCategory.updated_at,
  );

  // 8. Confirm unchanged properties retain original values
  TestValidator.equals("id unchanged", updatedCategory.id, initialCategory.id);
  TestValidator.equals(
    "created_at unchanged",
    updatedCategory.created_at,
    initialCategory.created_at,
  );
}
