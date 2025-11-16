import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test updating category visual representation by modifying the image URL.
 *
 * This scenario validates that administrators can update category image URLs
 * for merchandising purposes. The test creates a category with an initial image
 * URL, then updates it to a new image URL to verify that category banners and
 * icons can be changed. Additionally, it validates that the image_url can be
 * set to null to remove an existing image when no longer needed.
 *
 * Workflow:
 *
 * 1. Create an admin account and authenticate
 * 2. Create a new category with an initial image URL
 * 3. Update the category's image URL to a new value
 * 4. Verify the updated image URL is reflected correctly
 * 5. Update the category's image URL to null to remove it
 * 6. Verify the image URL has been removed (null)
 */
export async function test_api_category_update_image_url(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123!",
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category with an initial image URL
  const initialImageUrl = typia.random<string & tags.Format<"uri">>();
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    image_url: initialImageUrl,
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(createdCategory);

  // Verify the category was created with the initial image URL
  TestValidator.equals(
    "initial image URL matches",
    createdCategory.image_url,
    initialImageUrl,
  );

  // Step 3: Update the category's image URL to a new value
  const newImageUrl = typia.random<string & tags.Format<"uri">>();
  const updatedCategoryWithNewImage: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.putByCategorycode(
      connection,
      {
        categoryCode: createdCategory.slug,
        body: {
          image_url: newImageUrl,
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategoryWithNewImage);

  // Step 4: Verify the updated image URL is reflected correctly
  TestValidator.equals(
    "updated image URL matches new value",
    updatedCategoryWithNewImage.image_url,
    newImageUrl,
  );
  TestValidator.equals(
    "category ID remains the same",
    updatedCategoryWithNewImage.id,
    createdCategory.id,
  );

  // Step 5: Update the category's image URL to null to remove it
  const updatedCategoryWithNullImage: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.putByCategorycode(
      connection,
      {
        categoryCode: createdCategory.slug,
        body: {
          image_url: null,
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategoryWithNullImage);

  // Step 6: Verify the image URL has been removed (set to null)
  TestValidator.equals(
    "image URL is null after removal",
    updatedCategoryWithNullImage.image_url,
    null,
  );
  TestValidator.equals(
    "category ID remains consistent",
    updatedCategoryWithNullImage.id,
    createdCategory.id,
  );
}
