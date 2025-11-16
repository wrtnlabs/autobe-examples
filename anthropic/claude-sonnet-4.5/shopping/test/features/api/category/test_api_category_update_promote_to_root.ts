import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test promoting a child category to root level by setting parent_id to null.
 *
 * This scenario validates the category hierarchy restructuring functionality
 * where administrators can promote nested subcategories to become independent
 * root-level categories. The test workflow includes admin authentication,
 * parent category creation, child category creation with parent relationship,
 * promotion to root level via parent_id nullification, and verification of the
 * new root status.
 */
export async function test_api_category_update_promote_to_root(
  connection: api.IConnection,
) {
  // Step 1: Admin Authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create Parent Category
  const parentCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: null,
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(parentCategory);

  // Step 3: Create Child Category with Parent Relationship
  const childCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: parentCategory.id,
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(childCategory);

  TestValidator.equals(
    "child category should have parent relationship",
    childCategory.parent_id,
    parentCategory.id,
  );

  // Step 4: Promote Child to Root by Setting parent_id to null
  const promotedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.putByCategorycode(
      connection,
      {
        categoryCode: childCategory.slug,
        body: {
          parent_id: null,
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(promotedCategory);

  // Step 5: Validation - Verify Promotion Success
  TestValidator.equals(
    "promoted category should have null parent_id",
    promotedCategory.parent_id,
    null,
  );

  TestValidator.equals(
    "promoted category should retain its ID",
    promotedCategory.id,
    childCategory.id,
  );

  TestValidator.equals(
    "promoted category should retain its slug",
    promotedCategory.slug,
    childCategory.slug,
  );
}
